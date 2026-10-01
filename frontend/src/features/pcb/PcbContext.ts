import { createContext, useContext } from "react";
import type { PcbState } from "./usePcbState";

export const PcbContext = createContext<PcbState | null>(null);

export function usePcb(): PcbState {
  const value = useContext(PcbContext);
  if (!value) throw new Error("usePcb must be used inside <PcbProvider>");
  return value;
}
