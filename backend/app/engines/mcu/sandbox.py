from __future__ import annotations

import ast
import operator
import re
from collections.abc import Callable
from typing import Any

MAX_STEPS = 5000
MAX_STRING = 2000
MAX_EXPONENT = 64

_BINARY: dict[type[ast.operator], Callable[[Any, Any], Any]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.BitAnd: operator.and_,
    ast.BitOr: operator.or_,
    ast.BitXor: operator.xor,
    ast.LShift: operator.lshift,
    ast.RShift: operator.rshift,
}

_UNARY: dict[type[ast.unaryop], Callable[[Any], Any]] = {
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
    ast.Not: operator.not_,
    ast.Invert: operator.invert,
}

_COMPARE: dict[type[ast.cmpop], Callable[[Any, Any], bool]] = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Is: operator.is_,
    ast.IsNot: operator.is_not,
}

_ALLOWED_NODES: tuple[type[ast.AST], ...] = (
    ast.Module,
    ast.Assign,
    ast.AugAssign,
    ast.If,
    ast.Expr,
    ast.Pass,
    ast.Name,
    ast.Load,
    ast.Store,
    ast.Constant,
    ast.BinOp,
    ast.UnaryOp,
    ast.BoolOp,
    ast.And,
    ast.Or,
    ast.Compare,
    ast.IfExp,
    ast.Call,
    ast.JoinedStr,
    ast.FormattedValue,
    *_BINARY,
    *_UNARY,
    *_COMPARE,
)


class FirmwareError(Exception):
    pass


class Firmware:
    def __init__(self, source: str) -> None:
        try:
            self._tree = ast.parse(source or "")
        except SyntaxError as exc:
            raise FirmwareError(f"line {exc.lineno}: {exc.msg}") from exc
        self._validate()
        self._steps = 0

    def run(self, scope: dict[str, Any], builtins: dict[str, Any]) -> None:
        self._steps = 0
        for statement in self._tree.body:
            self._execute(statement, scope, builtins)

    def _validate(self) -> None:
        for node in ast.walk(self._tree):
            line = getattr(node, "lineno", "?")
            if not isinstance(node, _ALLOWED_NODES):
                raise FirmwareError(
                    f"line {line}: '{type(node).__name__}' is not supported in firmware"
                )
            if isinstance(node, ast.Name) and node.id.startswith("_"):
                raise FirmwareError(f"line {line}: names starting with '_' are not allowed")
            if isinstance(node, ast.Call) and (
                not isinstance(node.func, ast.Name) or node.keywords
            ):
                raise FirmwareError(f"line {line}: only plain function calls are allowed")
            if isinstance(node, ast.Assign) and not all(
                isinstance(t, ast.Name) for t in node.targets
            ):
                raise FirmwareError(f"line {line}: only simple variable assignment is allowed")

    def _tick(self) -> None:
        self._steps += 1
        if self._steps > MAX_STEPS:
            raise FirmwareError("firmware exceeded its per-tick step budget")

    def _execute(self, node: ast.stmt, scope: dict[str, Any], builtins: dict[str, Any]) -> None:
        self._tick()
        try:
            if isinstance(node, ast.Assign):
                value = self._eval(node.value, scope, builtins)
                for target in node.targets:
                    scope[target.id] = value  # type: ignore[attr-defined]
            elif isinstance(node, ast.AugAssign) and isinstance(node.target, ast.Name):
                name = node.target.id
                current = self._lookup(name, scope, builtins)
                scope[name] = self._binary(
                    node.op, current, self._eval(node.value, scope, builtins)
                )
            elif isinstance(node, ast.If):
                branch = node.body if self._eval(node.test, scope, builtins) else node.orelse
                for statement in branch:
                    self._execute(statement, scope, builtins)
            elif isinstance(node, ast.Expr):
                self._eval(node.value, scope, builtins)
        except FirmwareError:
            raise
        except Exception as exc:
            raise FirmwareError(f"line {node.lineno}: {exc}") from exc

    def _lookup(self, name: str, scope: dict[str, Any], builtins: dict[str, Any]) -> Any:
        if name in scope:
            return scope[name]
        if name in builtins:
            return builtins[name]
        raise FirmwareError(f"name '{name}' is not defined")

    def _binary(self, op: ast.operator, left: Any, right: Any) -> Any:
        if (
            isinstance(op, ast.Pow | ast.LShift)
            and isinstance(right, int | float)
            and abs(right) > MAX_EXPONENT
        ):
            raise FirmwareError("exponent too large")
        if (
            isinstance(op, ast.Mult)
            and isinstance(left, str | int)
            and isinstance(right, str | int)
        ):
            text, count = (left, right) if isinstance(left, str) else (right, left)
            if isinstance(text, str) and isinstance(count, int) and len(text) * count > MAX_STRING:
                raise FirmwareError("string too long")
        result = _BINARY[type(op)](left, right)
        if isinstance(result, str) and len(result) > MAX_STRING:
            raise FirmwareError("string too long")
        return result

    def _eval(self, node: ast.expr, scope: dict[str, Any], builtins: dict[str, Any]) -> Any:
        self._tick()
        match node:
            case ast.Constant(value=value):
                return value
            case ast.Name(id=name):
                return self._lookup(name, scope, builtins)
            case ast.BinOp(left=left, op=op, right=right):
                return self._binary(
                    op, self._eval(left, scope, builtins), self._eval(right, scope, builtins)
                )
            case ast.UnaryOp(op=op, operand=operand):
                return _UNARY[type(op)](self._eval(operand, scope, builtins))
            case ast.BoolOp(op=op, values=values):
                result: Any = None
                for value_node in values:
                    result = self._eval(value_node, scope, builtins)
                    if isinstance(op, ast.And) != bool(result):
                        return result
                return result
            case ast.Compare(left=left, ops=ops, comparators=comparators):
                current = self._eval(left, scope, builtins)
                for compare_op, comparator in zip(ops, comparators, strict=True):
                    following = self._eval(comparator, scope, builtins)
                    if not _COMPARE[type(compare_op)](current, following):
                        return False
                    current = following
                return True
            case ast.IfExp(test=test, body=body, orelse=orelse):
                chosen = body if self._eval(test, scope, builtins) else orelse
                return self._eval(chosen, scope, builtins)
            case ast.Call(func=ast.Name(id=name), args=args):
                function = builtins.get(name)
                if not callable(function):
                    raise FirmwareError(f"'{name}' is not a firmware function")
                return function(*(self._eval(a, scope, builtins) for a in args))
            case ast.JoinedStr(values=values):
                return "".join(str(self._eval(v, scope, builtins)) for v in values)
            case ast.FormattedValue(value=value, format_spec=spec):
                spec_text = self._eval(spec, scope, builtins) if spec is not None else ""
                if any(int(n) > MAX_STRING for n in re.findall(r"\d+", spec_text)):
                    raise FirmwareError("format width too large")
                return format(self._eval(value, scope, builtins), spec_text)
        raise FirmwareError(f"unsupported expression '{type(node).__name__}'")
