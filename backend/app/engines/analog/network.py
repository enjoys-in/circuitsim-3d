from __future__ import annotations

from collections.abc import Iterable

from app.domain.entities.project import Circuit
from app.engines.analog.devices import DEVICE_FACTORIES, SOURCE_KEYS, Device, Drive
from app.engines.analog.devices.base import Resolver
from app.engines.analog.solver import GMIN, Context, Node, Stamper, solve_linear
from app.engines.netlist import Netlist, split_endpoint

MAX_NEWTON_ITERATIONS = 200
MAX_STEP = 1.0
TOLERANCE = 1e-6


class AnalogNetwork:
    def __init__(
        self,
        circuit: Circuit,
        *,
        ground_nodes: set[int] | None = None,
        skip: Iterable[str] = (),
    ) -> None:
        self.netlist = Netlist(circuit)
        self.labels = {i.id: i.label or i.id for i in circuit.instances}
        self.warnings: list[str] = []
        self.ground = ground_nodes if ground_nodes is not None else self._find_ground(circuit)
        self._index: dict[int, int] = {}
        for node in range(self.netlist.node_count):
            if node not in self.ground:
                self._index[node] = len(self._index)

        self._floating = 0
        excluded = set(skip)
        self.devices: list[Device] = []
        for instance in circuit.instances:
            factory = DEVICE_FACTORIES.get(instance.component_key)
            if factory and instance.component_key not in excluded:
                self.devices.append(factory(instance, self._resolver(instance.id)))

        self._node_count = len(self._index) + self._floating
        size = self._node_count
        for device in self.devices:
            if device.branches:
                device.branch = size
                size += device.branches
        self._size = size
        self.drives: list[Drive] = []
        self.nonlinear = any(d.nonlinear for d in self.devices)
        self.context = Context(x=[0.0] * size)

    def _resolver(self, instance_id: str) -> Resolver:
        def resolve(pin: str) -> Node:
            node = self.netlist.node(instance_id, pin)
            if node is None:
                index = len(self._index) + self._floating
                self._floating += 1
                return index
            return self._index.get(node)

        return resolve

    def matrix_node(self, node: int | None) -> Node:
        return None if node is None else self._index.get(node)

    def set_drives(self, drives: list[tuple[int, float, float]]) -> None:
        self.drives = [Drive(self.matrix_node(node), volts, r) for node, volts, r in drives]

    def voltage(self, node: int) -> float:
        return self.context.v(self.matrix_node(node))

    def node_voltages(self) -> dict[int, float]:
        return {node: self.voltage(node) for node in range(self.netlist.node_count)}

    def node_label(self, node: int) -> str:
        names = [
            f"{self.labels.get(inst, inst)}.{pin}"
            for inst, pin in map(split_endpoint, self.netlist.endpoints(node))
        ]
        return min(names) if names else f"node{node}"

    def solve_op(self) -> Context:
        self.context.mode, self.context.dt = "op", 0.0
        self._newton()
        for device in self.devices:
            device.accept(self.context)
        return self.context

    def step(self, dt: float, time: float) -> Context:
        self.context.mode, self.context.dt, self.context.time = "tran", dt, time
        self._newton()
        for device in self.devices:
            device.accept(self.context)
        return self.context

    def device_warnings(self) -> list[str]:
        return [w for d in self.devices for w in d.warnings(self.context)]

    def _newton(self) -> None:
        ctx = self.context
        iterative = self.nonlinear
        for _ in range(MAX_NEWTON_ITERATIONS):
            stamper = Stamper(self._size)
            for node in range(self._node_count):
                stamper.conductance(node, None, GMIN)
            for device in (*self.devices, *self.drives):
                device.stamp(stamper, ctx)
            solution = solve_linear(stamper.a, stamper.z)
            if not iterative:
                ctx.x, ctx.converged = solution, True
                return
            delta = max((abs(solution[i] - ctx.x[i]) for i in range(self._node_count)), default=0.0)
            ctx.x = [
                ctx.x[i] + max(-MAX_STEP, min(MAX_STEP, solution[i] - ctx.x[i]))
                if i < self._node_count
                else solution[i]
                for i in range(self._size)
            ]
            if delta < TOLERANCE:
                ctx.converged = True
                return
        ctx.converged = False
        message = "Analog solver did not fully converge; results are approximate"
        if message not in self.warnings:
            self.warnings.append(message)

    def _find_ground(self, circuit: Circuit) -> set[int]:
        ground = {
            node
            for inst in circuit.instances
            if inst.component_key == "ground"
            and (node := self.netlist.node(inst.id, "gnd")) is not None
        }
        if ground:
            return ground
        for inst in circuit.instances:
            if inst.component_key in SOURCE_KEYS:
                node = self.netlist.node(inst.id, "-")
                if node is not None:
                    return {node}
        if self.netlist.node_count:
            self.warnings.append(
                "No ground reference found; voltages are relative to an arbitrary node"
            )
            return {0}
        return set()
