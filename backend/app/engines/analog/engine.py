from __future__ import annotations

from typing import Any

from app.domain.engines import SimulationEngine
from app.domain.entities.project import Circuit
from app.engines.analog.devices import ANALOG_KEYS, Device, VoltageSource
from app.engines.analog.devices.semiconductors import Led
from app.engines.analog.network import AnalogNetwork
from app.engines.custom import simulatable_keys
from app.engines.result import ResultBuilder

MAX_SERIES = 16
MAX_FRAMES = 120


def _clean(state: dict[str, Any]) -> dict[str, Any]:
    return {k: round(v, 6) if isinstance(v, float) else v for k, v in state.items()}


def _number(options: dict[str, Any], key: str, default: float, low: float, high: float) -> float:
    try:
        value = float(options.get(key, default))
    except (TypeError, ValueError):
        value = default
    return min(max(value, low), high)


class AnalogEngine(SimulationEngine):
    name = "analog"

    def supports(self, circuit: Circuit) -> bool:
        keys = simulatable_keys(circuit)
        return bool(keys - {"ground"}) and keys <= ANALOG_KEYS

    def run(self, circuit: Circuit, options: dict[str, Any]) -> dict[str, Any]:
        network = AnalogNetwork(circuit)
        if options.get("analysis") == "tran":
            result = self._transient(network, options)
        else:
            result = ResultBuilder(self.name, "op")
            network.solve_op()
        self._finish(network, result)
        return result.build()

    def _transient(self, network: AnalogNetwork, options: dict[str, Any]) -> ResultBuilder:
        t_stop = _number(options, "t_stop", 0.01, 1e-6, 100.0)
        steps = int(_number(options, "steps", 200, 10, 2000))
        dt = t_stop / steps
        result = ResultBuilder(self.name, "tran").timebase("s")
        tracked = [n for n in range(network.netlist.node_count) if n not in network.ground][
            :MAX_SERIES
        ]
        stride = max(1, steps // MAX_FRAMES)
        for k in range(1, steps + 1):
            network.step(dt, k * dt)
            result.sample(round(k * dt, 9))
            for node in tracked:
                result.point(
                    f"v{node}",
                    round(network.voltage(node), 6),
                    label=network.node_label(node),
                    unit="V",
                )
            if k % stride == 0 or k == steps:
                result.frame(self._nets(network), self._states(network.devices, network))
        return result

    def _finish(self, network: AnalogNetwork, result: ResultBuilder) -> None:
        result.nets(self._nets(network))
        for instance_id, state in self._states(network.devices, network).items():
            result.instance(instance_id, **state)
        for device in network.devices:
            ctx = network.context
            if isinstance(device, VoltageSource):
                state = device.report(ctx)
                result.summary(f"{device.label} current", round(state["current"], 6), "A")
                result.summary(f"{device.label} power", round(state["power"], 6), "W")
            elif isinstance(device, Led):
                result.summary(f"{device.label} current", round(device.current(ctx), 6), "A")
        for warning in (*network.warnings, *network.device_warnings()):
            result.warn(warning)

    @staticmethod
    def _nets(network: AnalogNetwork) -> dict[str, Any]:
        voltages = {n: round(v, 6) for n, v in network.node_voltages().items()}
        return network.netlist.by_net(dict(voltages))

    @staticmethod
    def _states(devices: list[Device], network: AnalogNetwork) -> dict[str, dict[str, Any]]:
        return {d.id: _clean(d.report(network.context)) for d in devices}
