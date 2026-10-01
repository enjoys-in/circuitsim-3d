import type { SimulationOutput } from "../../domain";
import type { Playback } from "../simulation/SimulationContext";
import { formatTime } from "./charts/timeFormat";

interface Props {
  result: SimulationOutput;
  playback: Playback;
}

export function PlaybackBar({ result, playback }: Props) {
  const { frame, frameCount, playing, setFrame, toggle } = playback;
  if (frameCount <= 1) return null;
  const aligned = frameCount === result.time.length;
  const label = aligned ? formatTime(result.time[frame] ?? 0, result.time_unit) : `${frame + 1}/${frameCount}`;

  return (
    <div className="playback">
      <button type="button" className="playback__toggle" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={frameCount - 1}
        value={frame}
        onChange={(e) => setFrame(Number(e.target.value))}
        aria-label="Simulation frame"
      />
      <span className="playback__time">{label}</span>
    </div>
  );
}
