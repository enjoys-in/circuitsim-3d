import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { audioEngine } from "../../shared/lib/audioEngine";
import { usePersistentState } from "../../shared/hooks/usePersistentState";

interface SoundValue {
  muted: boolean;
  toggleMuted: () => void;
}

const SoundContext = createContext<SoundValue | null>(null);
const STORAGE_KEY = "circuitsim.sound.muted";

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = usePersistentState<boolean>(STORAGE_KEY, false);

  useEffect(() => {
    audioEngine.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const resume = () => audioEngine.ensure();
    window.addEventListener("pointerdown", resume);
    return () => window.removeEventListener("pointerdown", resume);
  }, []);

  const value = useMemo<SoundValue>(() => ({ muted, toggleMuted: () => setMuted((m) => !m) }), [muted, setMuted]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundValue {
  const value = useContext(SoundContext);
  if (!value) throw new Error("useSound must be used inside <SoundProvider>");
  return value;
}
