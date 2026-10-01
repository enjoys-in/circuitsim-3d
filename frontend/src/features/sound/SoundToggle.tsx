import { Button } from "../../shared/ui/Button";
import { useSound } from "./SoundContext";

export function SoundToggle() {
  const { muted, toggleMuted } = useSound();
  return (
    <Button
      size="sm"
      onClick={toggleMuted}
      aria-pressed={muted}
      title={muted ? "Sound off" : "Sound on"}
    >
      {muted ? "🔇" : "🔊"}
    </Button>
  );
}
