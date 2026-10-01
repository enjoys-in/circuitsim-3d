from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

SeriesKind = Literal["digital", "analog"]


@dataclass(slots=True)
class Series:
    id: str
    label: str
    unit: str
    kind: SeriesKind
    values: list[float | None] = field(default_factory=list)


@dataclass(slots=True)
class Frame:
    nets: dict[str, Any]
    instances: dict[str, dict[str, Any]]


class ResultBuilder:
    def __init__(self, engine: str, analysis: str) -> None:
        self._engine = engine
        self._analysis = analysis
        self._nets: dict[str, Any] = {}
        self._instances: dict[str, dict[str, Any]] = {}
        self._summary: list[dict[str, Any]] = []
        self._time: list[float] = []
        self._time_unit = "s"
        self._series: dict[str, Series] = {}
        self._frames: list[Frame] = []
        self._log: list[dict[str, Any]] = []
        self._warnings: list[str] = []

    def nets(self, values: dict[str, Any]) -> ResultBuilder:
        self._nets = values
        return self

    def instance(self, instance_id: str, **state: Any) -> ResultBuilder:
        self._instances.setdefault(instance_id, {}).update(state)
        return self

    def summary(self, label: str, value: Any, unit: str = "") -> ResultBuilder:
        self._summary.append({"label": label, "value": value, "unit": unit})
        return self

    def timebase(self, unit: str) -> ResultBuilder:
        self._time_unit = unit
        return self

    def sample(self, t: float) -> ResultBuilder:
        self._time.append(t)
        return self

    def point(
        self,
        series_id: str,
        value: float | None,
        *,
        label: str,
        unit: str = "",
        kind: SeriesKind = "analog",
    ) -> ResultBuilder:
        series = self._series.get(series_id)
        if series is None:
            series = Series(series_id, label, unit, kind, [None] * (len(self._time) - 1))
            self._series[series_id] = series
        series.values.append(value)
        return self

    def frame(self, nets: dict[str, Any], instances: dict[str, dict[str, Any]]) -> ResultBuilder:
        self._frames.append(Frame(nets, instances))
        return self

    def log(self, t: float, source: str, text: str) -> ResultBuilder:
        self._log.append({"t": t, "source": source, "text": text})
        return self

    def warn(self, message: str) -> ResultBuilder:
        if message not in self._warnings:
            self._warnings.append(message)
        return self

    def build(self) -> dict[str, Any]:
        length = len(self._time)
        for series in self._series.values():
            series.values.extend([None] * (length - len(series.values)))
        return {
            "engine": self._engine,
            "analysis": self._analysis,
            "nets": self._nets,
            "instances": self._instances,
            "summary": self._summary,
            "time": self._time,
            "time_unit": self._time_unit,
            "series": [
                {"id": s.id, "label": s.label, "unit": s.unit, "kind": s.kind, "values": s.values}
                for s in self._series.values()
            ],
            "frames": [{"nets": f.nets, "instances": f.instances} for f in self._frames],
            "log": self._log,
            "warnings": self._warnings,
        }
