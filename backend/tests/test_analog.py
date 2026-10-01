from __future__ import annotations

import math

from app.engines.analog import AnalogEngine
from tests.builders import circuit

engine = AnalogEngine()


def test_voltage_divider() -> None:
    c = circuit(
        [
            ("V", "dc_supply", {"voltage": 10}),
            ("R1", "resistor", {"resistance": 1000}),
            ("R2", "resistor", {"resistance": 3000}),
        ],
        [("V:+", "R1:a"), ("R1:b", "R2:a"), ("R2:b", "V:-")],
    )
    result = engine.run(c, {})
    assert math.isclose(result["nets"]["w1"], 7.5, rel_tol=1e-6)
    assert math.isclose(result["instances"]["V"]["current"], 0.0025, rel_tol=1e-6)


def test_led_current_and_overcurrent_warning() -> None:
    limited = circuit(
        [
            ("V", "dc_supply", {"voltage": 5}),
            ("R", "resistor", {"resistance": 220}),
            ("D", "led", {"color": "red"}),
        ],
        [("V:+", "R:a"), ("R:b", "D:anode"), ("D:cathode", "V:-")],
    )
    led = engine.run(limited, {})["instances"]["D"]
    assert led["on"] and 0.012 < led["current"] < 0.016

    direct = circuit(
        [("V", "dc_supply", {"voltage": 5}), ("D", "led", {})],
        [("V:+", "D:anode"), ("D:cathode", "V:-")],
    )
    assert any("overcurrent" in w for w in engine.run(direct, {})["warnings"])


def test_rc_transient_follows_exponential() -> None:
    c = circuit(
        [
            ("V", "dc_supply", {"voltage": 5}),
            ("R", "resistor", {"resistance": 1000}),
            ("C", "capacitor", {"capacitance": "1uF"}),
        ],
        [("V:+", "R:a"), ("R:b", "C:a"), ("C:b", "V:-")],
    )
    result = engine.run(c, {"analysis": "tran", "t_stop": 0.005, "steps": 500})
    series = next(s for s in result["series"] if s["label"] in {"C.a", "R.b"})
    at_tau = series["values"][99]
    assert math.isclose(at_tau, 5 * (1 - math.exp(-1)), rel_tol=0.01)


def test_npn_switch_saturates() -> None:
    c = circuit(
        [
            ("V", "dc_supply", {"voltage": 5}),
            ("RB", "resistor", {"resistance": 10000}),
            ("RC", "resistor", {"resistance": 220}),
            ("D", "led", {}),
            ("Q", "npn_bjt", {}),
        ],
        [
            ("V:+", "RB:a"),
            ("RB:b", "Q:base"),
            ("V:+", "RC:a"),
            ("RC:b", "D:anode"),
            ("D:cathode", "Q:collector"),
            ("Q:emitter", "V:-"),
        ],
    )
    result = engine.run(c, {})
    assert result["instances"]["Q"]["region"] == "saturation"
    assert result["instances"]["D"]["on"]


def test_ldo_regulates() -> None:
    c = circuit(
        [
            ("V", "dc_supply", {"voltage": 5}),
            ("U", "ldo_regulator", {"vout": 3.3}),
            ("R", "resistor", {"resistance": 330}),
        ],
        [("V:+", "U:vin"), ("V:-", "U:gnd"), ("U:vout", "R:a"), ("R:b", "V:-")],
    )
    assert math.isclose(engine.run(c, {})["instances"]["U"]["voltage"], 3.3, rel_tol=0.01)


def test_speaker_and_buzzer_report_on_when_powered() -> None:
    for part in ("buzzer", "speaker"):
        c = circuit(
            [("V", "dc_supply", {"voltage": 5}), ("X", part, {}), ("G", "ground", {})],
            [("V:+", "X:+"), ("X:-", "V:-"), ("G:gnd", "V:-")],
        )
        state = engine.run(c, {})["instances"]["X"]
        assert state["on"] is True
        assert state["current"] > 0.05
