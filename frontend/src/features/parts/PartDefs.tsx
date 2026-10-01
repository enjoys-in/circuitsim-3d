import { memo } from "react";
import { LED_COLORS } from "./paint";
import "./parts.css";

type Stop = [offset: string, color: string];

const LINEAR: Record<string, Stop[]> = {
  metal: [["0", "#f8fafc"], ["0.45", "#94a3b8"], ["1", "#e2e8f0"]],
  gold: [["0", "#fef3c7"], ["0.5", "#d97706"], ["1", "#fcd34d"]],
  chip: [["0", "#3f3f46"], ["1", "#111113"]],
  plastic: [["0", "#52525b"], ["0.5", "#18181b"], ["1", "#3f3f46"]],
  "white-plastic": [["0", "#ffffff"], ["1", "#cbd5e1"]],
  resistor: [["0", "#f8ecd4"], ["0.5", "#d6b27a"], ["1", "#f2dcb3"]],
  electrolytic: [["0", "#60a5fa"], ["0.5", "#1d4ed8"], ["1", "#1e3a8a"]],
  copper: [["0", "#fdba74"], ["0.5", "#b45309"], ["1", "#f59e0b"]],
  glass: [["0", "#fed7aa"], ["0.5", "#ea580c"], ["1", "#fdba74"]],
  "pcb-green": [["0", "#16a34a"], ["1", "#14532d"]],
  "pcb-blue": [["0", "#2563eb"], ["1", "#1e3a8a"]],
  "pcb-teal": [["0", "#0ea5b0"], ["1", "#0b5d66"]],
  "pcb-purple": [["0", "#9333ea"], ["1", "#4c1d95"]],
  "pcb-black": [["0", "#3f3f46"], ["1", "#09090b"]],
  "pcb-red": [["0", "#dc2626"], ["1", "#7f1d1d"]],
};

function PartDefsImpl() {
  return (
    <svg className="part-defs" width="0" height="0" aria-hidden focusable="false">
      <defs>
        {Object.entries(LINEAR).map(([id, stops]) => (
          <linearGradient key={id} id={`cs-${id}`} x1="0" y1="0" x2="0" y2="1">
            {stops.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        ))}
        <radialGradient id="cs-ceramic" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
        {Object.entries(LED_COLORS).map(([name, color]) => (
          <radialGradient key={name} id={`cs-led-${name}`} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor={color} stopOpacity="0.85" />
            <stop offset="1" stopColor={color} stopOpacity="0.55" />
          </radialGradient>
        ))}
        <filter id="cs-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <filter id="cs-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
    </svg>
  );
}

export const PartDefs = memo(PartDefsImpl);
