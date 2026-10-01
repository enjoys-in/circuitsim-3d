from __future__ import annotations

from app.engines.digital import DigitalEngine
from tests.builders import circuit

engine = DigitalEngine()


def test_gate_fan_out_shares_a_net() -> None:
    c = circuit(
        [
            ("A", "input", {"value": 1}),
            ("B", "input", {"value": 1}),
            ("G", "and", {}),
            ("N", "not", {}),
            ("Y", "output", {}),
            ("Z", "output", {}),
        ],
        [
            ("A:out", "G:a"),
            ("B:out", "G:b"),
            ("G:out", "Y:in"),
            ("G:out", "N:in"),
            ("N:out", "Z:in"),
        ],
    )
    result = engine.run(c, {})
    assert result["instances"]["Y"]["value"] == 1
    assert result["instances"]["Z"]["value"] == 0


def test_toggle_flip_flops_count_in_binary() -> None:
    c = circuit(
        [
            ("CLK", "clock", {"period": 2}),
            ("ONE", "input", {"value": 1}),
            ("T0", "tff", {}),
            ("T1", "tff", {}),
            ("NQ0", "not", {}),
        ],
        [
            ("CLK:out", "T0:clk"),
            ("ONE:out", "T0:t"),
            ("ONE:out", "T1:t"),
            ("T0:q", "NQ0:in"),
            ("NQ0:out", "T1:clk"),
        ],
    )
    result = engine.run(c, {"ticks": 9})
    q0 = next(s for s in result["series"] if s["id"] == "T0")["values"]
    q1 = next(s for s in result["series"] if s["id"] == "T1")["values"]
    counts = [a + 2 * b for a, b in zip(q0, q1, strict=True)][1::2]
    assert counts == [1, 2, 3, 0]


def test_d_flip_flop_latches_on_rising_edge() -> None:
    c = circuit(
        [("D", "input", {"value": 1}), ("CLK", "clock", {"period": 4}), ("FF", "dff", {})],
        [("D:out", "FF:d"), ("CLK:out", "FF:clk")],
    )
    q = next(s for s in engine.run(c, {"ticks": 4})["series"] if s["id"] == "FF")["values"]
    assert q == [0, 0, 1, 1]
