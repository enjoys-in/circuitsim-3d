import { useCallback, useEffect, useState } from "react";
import type { SimulationOutput } from "../../domain";
import { PLAYBACK_INTERVAL_MS } from "../../shared/constants";
import { useInterval } from "../../shared/hooks/useInterval";
import type { Playback } from "./SimulationContext";

const ANIMATED_ENGINES = new Set(["mcu", "digital"]);

export function usePlayback(result: SimulationOutput | null): Playback {
  const frameCount = result?.frames.length ?? 0;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!result || result.frames.length <= 1) {
      setPlaying(false);
      setFrame(Math.max(0, (result?.frames.length ?? 1) - 1));
      return;
    }
    const animate = ANIMATED_ENGINES.has(result.engine);
    setPlaying(animate);
    setFrame((current) => (animate ? Math.min(current, result.frames.length - 1) : result.frames.length - 1));
  }, [result]);

  useInterval(() => setFrame((f) => (f + 1) % Math.max(frameCount, 1)), playing && frameCount > 1 ? PLAYBACK_INTERVAL_MS : null);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const seek = useCallback((next: number) => {
    setPlaying(false);
    setFrame(next);
  }, []);

  return { frame, frameCount, playing, setFrame: seek, toggle };
}
