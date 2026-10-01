import { useEffect } from "react";
import { toNumber } from "../../shared/lib/format";
import { audioEngine } from "../../shared/lib/audioEngine";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useLiveState } from "../simulation/SimulationContext";
import { useSound } from "./SoundContext";

const TONE: Record<string, { frequency: number; type: OscillatorType }> = {
  buzzer: { frequency: 2700, type: "square" },
  speaker: { frequency: 440, type: "sine" },
  active_buzzer: { frequency: 2400, type: "square" },
};

// Headless: turns live buzzer/speaker states into Web Audio tones.
export function SimulationSound() {
  const { circuit } = useCircuitGraph();
  const live = useLiveState();
  const { muted } = useSound();

  useEffect(() => {
    if (muted) {
      audioEngine.silenceAll();
      return;
    }
    const active = new Set<string>();
    for (const inst of circuit.instances) {
      const tone = TONE[inst.component_key];
      if (!tone) continue;
      if (live.instances[inst.id]?.on) {
        const frequency = toNumber(inst.params.frequency, tone.frequency);
        audioEngine.set(inst.id, frequency, true, tone.type);
        active.add(inst.id);
      }
    }
    audioEngine.retain(active);
  }, [circuit, live, muted]);

  useEffect(() => () => audioEngine.silenceAll(), []);
  return null;
}
