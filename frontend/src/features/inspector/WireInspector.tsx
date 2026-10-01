import { formatSI } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import type { WireEdgeType } from "../board/nodes/types";
import { useLiveNet } from "../simulation/SimulationContext";

export function WireInspector({ edge }: { edge: WireEdgeType }) {
  const { nodes } = useCircuitGraph();
  const { removeEdge, setWaypoints } = useCircuitActions();
  const { engine, value } = useLiveNet(edge.id);
  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;
  const joints = edge.data?.waypoints?.length ?? 0;
  const reading =
    value === undefined || value === null ? "—" : engine === "digital" ? `logic ${value}` : formatSI(value, "V");

  return (
    <div className="inspector__body">
      <header className="inspector__header">
        <div>
          <h3>Wire</h3>
          <p className="inspector__muted">
            {labelOf(edge.source)}.{edge.sourceHandle} → {labelOf(edge.target)}.{edge.targetHandle}
          </p>
        </div>
        <span className="inspector__swatch" style={{ background: edge.data?.color }} />
      </header>
      <section className="inspector__section">
        <h4 className="panel-heading">Routing</h4>
        <p className="inspector__muted">
          Double-click the wire to add a join point, drag it to shape the route, double-click a
          point to remove it.
        </p>
        {joints > 0 && (
          <Button size="sm" onClick={() => setWaypoints(edge.id, [])}>
            Straighten ({joints} point{joints === 1 ? "" : "s"})
          </Button>
        )}
      </section>
      <section className="inspector__section">
        <h4 className="panel-heading">Live</h4>
        <dl className="readout">
          <div className="readout__row">
            <dt>Net value</dt>
            <dd>{reading}</dd>
          </div>
        </dl>
      </section>
      <Button variant="danger" size="sm" onClick={() => removeEdge(edge.id)}>
        Remove wire
      </Button>
    </div>
  );
}
