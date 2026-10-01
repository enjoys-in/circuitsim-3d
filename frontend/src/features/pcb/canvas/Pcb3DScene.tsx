import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useCatalog } from "../../catalog/CatalogContext";
import { useCircuitGraph } from "../../board/CircuitGraphContext";
import { getFootprint } from "../model/footprints";
import { usePcb } from "../PcbContext";

const THICK = 8;
const PAD_H = 1.4;

// Rough body colour per part family so the board reads at a glance.
const CATEGORY_COLOR: Record<string, string> = {
  passive: "#3b82f6",
  semiconductor: "#111827",
  power: "#7c3aed",
  connector: "#b45309",
  dev_board: "#0f766e",
  logic: "#334155",
  sensor: "#0e7490",
  actuator: "#be185d",
  display: "#0891b2",
};

// Taller bodies for boards/connectors, flatter for passives/displays.
const CATEGORY_HEIGHT: Record<string, number> = {
  passive: 9,
  semiconductor: 12,
  power: 18,
  connector: 20,
  dev_board: 22,
  logic: 10,
  sensor: 14,
  actuator: 20,
  display: 7,
};

export function Pcb3DScene() {
  const pcb = usePcb();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();
  const { board } = pcb;
  const ox = board.width / 2;
  const oz = board.height / 2;
  const diag = Math.hypot(board.width, board.height);

  return (
    <div className="pcb3d">
      <div className="pcb3d__controls">
        <span className="pcb3d__hint">drag to orbit · scroll to zoom · right-drag to pan</span>
      </div>
      <div className="pcb3d-canvas">
        <Canvas shadows camera={{ position: [diag * 0.45, diag * 0.95, diag * 0.7], fov: 48, near: 1, far: diag * 12 }}>
          <color attach="background" args={["#06141a"]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[ox, diag, oz]} intensity={1.1} castShadow />
          <directionalLight position={[-ox, diag * 0.6, -oz]} intensity={0.4} />

          <mesh receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[board.width, THICK, board.height]} />
            <meshStandardMaterial color="#0b6b3a" roughness={0.78} metalness={0.05} />
          </mesh>

          {pcb.pads.map((pad) => (
            <mesh key={pad.id} position={[pad.point.x - ox, THICK / 2 + PAD_H / 2, pad.point.y - oz]}>
              <cylinderGeometry args={[4, 4, PAD_H, 20]} />
              <meshStandardMaterial color="#e3b25a" metalness={0.8} roughness={0.35} />
            </mesh>
          ))}

          {pcb.traces
            .filter((t) => pcb.visible[t.layer])
            .map((t) => {
              // Top copper sits above the board, bottom copper under it.
              const y = t.layer === "top" ? THICK / 2 + PAD_H + 0.3 : -(THICK / 2 + PAD_H + 0.3);
              return (
                <Line
                  key={t.id}
                  points={t.points.map((p) => [p.x - ox, y, p.y - oz] as [number, number, number])}
                  color={t.layer === "top" ? "#e0533f" : "#3f7de0"}
                  lineWidth={2.5}
                />
              );
            })}

          {pcb.vias.map((v) => (
            <mesh key={v.id} position={[v.x - ox, 0, v.y - oz]}>
              <cylinderGeometry args={[2.2, 2.2, THICK + PAD_H * 2 + 1, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}

          {circuit.instances.map((inst) => {
            const def = byKey.get(inst.component_key);
            const placement = pcb.placements.get(inst.id);
            if (!def || !placement) return null;
            const fp = getFootprint(def);
            const w = placement.bodyW ?? fp.width;
            const h = placement.bodyH ?? fp.height;
            const ch = CATEGORY_HEIGHT[def.category] ?? 14;
            const bottom = placement.side === "bottom";
            const y = bottom ? -(THICK / 2 + ch / 2) : THICK / 2 + ch / 2;
            const labelY = bottom ? y - ch / 2 - 4 : y + ch / 2 + 4;
            return (
              <group
                key={inst.id}
                position={[placement.x - ox, 0, placement.y - oz]}
                rotation={[0, (-placement.rotation * Math.PI) / 180, 0]}
              >
                <mesh castShadow position={[0, y, 0]}>
                  <boxGeometry args={[w, ch, h]} />
                  <meshStandardMaterial color={CATEGORY_COLOR[def.category] ?? "#475569"} roughness={0.6} />
                </mesh>
                <Html position={[0, labelY, 0]} center distanceFactor={diag} prepend>
                  <div className="pcb3d-label">{inst.label}</div>
                </Html>
              </group>
            );
          })}

          <OrbitControls enableDamping makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      </div>
    </div>
  );
}
