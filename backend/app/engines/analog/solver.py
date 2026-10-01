from __future__ import annotations

from dataclasses import dataclass

from app.core.exceptions import ValidationError

GMIN = 1e-12
PIVOT_EPSILON = 1e-18


class SingularCircuitError(ValidationError):
    pass


def solve_linear(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    size = len(rhs)
    a = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(size):
        pivot = max(range(col, size), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < PIVOT_EPSILON:
            raise SingularCircuitError(
                "Circuit cannot be solved: check for shorted sources, "
                "parallel voltage sources or parts with no path to ground"
            )
        a[col], a[pivot] = a[pivot], a[col]
        head = a[col]
        for row in range(col + 1, size):
            factor = a[row][col] / head[col]
            if factor:
                target = a[row]
                for k in range(col, size + 1):
                    target[k] -= factor * head[k]
    x = [0.0] * size
    for row in range(size - 1, -1, -1):
        total = a[row][size] - sum(a[row][k] * x[k] for k in range(row + 1, size))
        x[row] = total / a[row][row]
    return x


Node = int | None


class Stamper:
    def __init__(self, size: int) -> None:
        self.a = [[0.0] * size for _ in range(size)]
        self.z = [0.0] * size

    def conductance(self, a: Node, b: Node, g: float) -> None:
        if a is not None:
            self.a[a][a] += g
        if b is not None:
            self.a[b][b] += g
        if a is not None and b is not None:
            self.a[a][b] -= g
            self.a[b][a] -= g

    def current(self, a: Node, b: Node, i: float) -> None:
        if a is not None:
            self.z[a] -= i
        if b is not None:
            self.z[b] += i

    def transconductance(self, a: Node, b: Node, c: Node, d: Node, g: float) -> None:
        for row, sign in ((a, 1.0), (b, -1.0)):
            if row is None:
                continue
            if c is not None:
                self.a[row][c] += sign * g
            if d is not None:
                self.a[row][d] -= sign * g

    def voltage_source(self, branch: int, a: Node, b: Node, volts: float) -> None:
        if a is not None:
            self.a[a][branch] += 1.0
            self.a[branch][a] += 1.0
        if b is not None:
            self.a[b][branch] -= 1.0
            self.a[branch][b] -= 1.0
        self.z[branch] = volts


@dataclass
class Context:
    x: list[float]
    mode: str = "op"
    dt: float = 0.0
    time: float = 0.0
    converged: bool = True

    def v(self, node: Node) -> float:
        return 0.0 if node is None else self.x[node]

    def between(self, a: Node, b: Node) -> float:
        return self.v(a) - self.v(b)
