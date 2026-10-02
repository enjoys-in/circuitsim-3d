import type { ComponentDef } from "../../../domain";
import { pinRow } from "../layout";
import { paint } from "../paint";
import { HeaderPin } from "../primitives/HeaderPin";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory, PartPin, PartSpec } from "../types";

const PITCH = 16;

function rowPins(def: ComponentDef, width: number, y: number): PartPin[] {
  const names = def.pins.map((p) => p.name);
  const start = (width - (names.length - 1) * PITCH) / 2;
  return pinRow(names, "bottom", start, PITCH, y);
}

function maleHeader(def: ComponentDef) {
  const count = def.pins.length;
  const width = count * PITCH + 18;
  const height = 58;
  const pins = rowPins(def, width, height - 14);
  function Art() {
    return (
      <g>
        <rect x={5} y={28} width={width - 10} height={22} rx={3} fill={paint.plastic} stroke="#0b0f17" />
        {pins.map((p) => (
          <rect key={`g${p.name}`} x={p.x - 2} y={16} width={4} height={34} rx={1} fill={paint.gold} />
        ))}
        {pins.map((p) => (
          <HeaderPin key={p.name} x={p.x} y={p.y} label={p.name} labelAt="above" />
        ))}
        <Silk x={width / 2} y={11} size={6}>
          {`1x${count} MALE`}
        </Silk>
      </g>
    );
  }
  return { width, height, pins, Art };
}

function femaleHeader(def: ComponentDef) {
  const count = def.pins.length;
  const width = count * PITCH + 18;
  const height = 58;
  const pins = rowPins(def, width, height - 16);
  function Art() {
    return (
      <g>
        <rect x={5} y={26} width={width - 10} height={26} rx={3} fill="#111826" stroke="#0b0f17" />
        {pins.map((p) => (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r={5} fill="#05070c" stroke="#334155" strokeWidth={1.2} />
            <circle cx={p.x} cy={p.y} r={1.8} fill={paint.gold} />
            <Silk x={p.x} y={p.y - 9} size={6} anchor="middle">
              {p.name.toUpperCase()}
            </Silk>
          </g>
        ))}
        <Silk x={width / 2} y={11} size={6}>
          {`1x${count} FEMALE`}
        </Silk>
      </g>
    );
  }
  return { width, height, pins, Art };
}

type UsbKind = "A" | "B" | "C";

function usbShell(kind: UsbKind, width: number) {
  const top = 18;
  const shellH = 30;
  if (kind === "C") {
    return (
      <>
        <rect x={10} y={top} width={width - 20} height={shellH} rx={shellH / 2} fill={paint.metal} stroke="#64748b" />
        <rect x={18} y={top + 7} width={width - 36} height={shellH - 14} rx={(shellH - 14) / 2} fill="#0b0f17" />
      </>
    );
  }
  const r = kind === "B" ? 5 : 2;
  return (
    <>
      <rect x={10} y={top} width={width - 20} height={shellH} rx={r} fill={paint.metal} stroke="#64748b" />
      <rect x={17} y={top + 6} width={width - 34} height={shellH - 12} rx={1.5} fill="#0b0f17" />
      {kind === "A" && <rect x={19} y={top + 8} width={width - 38} height={5} rx={1} fill="#1e293b" />}
    </>
  );
}

function usbFactory(kind: UsbKind): PartFactory {
  return (def) => {
    const width = Math.max(96, def.pins.length * PITCH + 24);
    const height = 62;
    const pins = rowPins(def, width, height - 8);
    function Art() {
      return (
        <g>
          {usbShell(kind, width)}
          <Silk x={width / 2} y={12} size={6.5}>
            {`USB-${kind}`}
          </Silk>
          {pins.map((p) => (
            <HeaderPin key={p.name} x={p.x} y={p.y} label={p.name} labelAt="above" />
          ))}
        </g>
      );
    }
    return { width, height, pins, Art };
  };
}

export const connectorParts: Record<string, PartFactory> = {
  net_label: () => netLabel(),
  header_male_1x2: (def) => maleHeader(def),
  header_male_1x4: (def) => maleHeader(def),
  header_female_1x4: (def) => femaleHeader(def),
  usb_a: usbFactory("A"),
  usb_b: usbFactory("B"),
  usb_c: usbFactory("C"),
};

function netLabel(): PartSpec {
  const width = 96;
  const height = 28;
  const pins: PartPin[] = [{ name: "pin", x: 6, y: height / 2, side: "left" }];
  function Art({ params }: PartArtProps) {
    const name = String(params.name ?? "").trim() || "NET";
    return (
      <g>
        <path
          d={`M6,${height / 2} L20,6 L${width - 6},6 L${width - 6},${height - 6} L20,${height - 6} Z`}
          fill="#0f2238"
          stroke="#38bdf8"
          strokeWidth={1.4}
        />
        <Silk x={(20 + width - 6) / 2} y={height / 2 + 3} size={9} anchor="middle">
          {name}
        </Silk>
        <circle cx={6} cy={height / 2} r={3} fill="#38bdf8" />
      </g>
    );
  }
  return { width, height, pins, Art };
}
