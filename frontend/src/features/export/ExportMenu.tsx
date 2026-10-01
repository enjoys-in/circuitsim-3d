import { useMemo, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { bomToCsv, buildBom, buildNetlist, downloadText } from "./exporters";
import "./export.css";

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const { circuit, nodes, edges } = useCircuitGraph();
  const { byKey } = useCatalog();
  const rows = useMemo(() => (open ? buildBom(circuit, byKey) : []), [open, circuit, byKey]);
  const totalParts = rows.reduce((n, r) => n + r.qty, 0);

  const downloadBom = () => downloadText(`circuitsim-bom-${stamp()}.csv`, bomToCsv(rows), "text/csv");
  const downloadNetlist = () => downloadText(`circuitsim-netlist-${stamp()}.txt`, buildNetlist(circuit));
  const downloadJson = () =>
    downloadText(`circuitsim-circuit-${stamp()}.json`, JSON.stringify(circuit, null, 2), "application/json");
  const downloadSvg = async () => {
    const { buildSchematicSvg } = await import("./schematicSvg");
    downloadText(`circuitsim-schematic-${stamp()}.svg`, buildSchematicSvg(nodes, edges), "image/svg+xml");
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} title="Export BOM, netlist or circuit">
        Export
      </Button>
      <Sheet
        open={open}
        title="Export"
        onClose={() => setOpen(false)}
        actions={<span className="sheet__soon">{totalParts} parts</span>}
      >
        <div className="export">
          <div className="export__actions">
            <Button variant="primary" size="sm" disabled={rows.length === 0} onClick={downloadBom}>
              BOM (.csv)
            </Button>
            <Button size="sm" disabled={circuit.nets.length === 0} onClick={downloadNetlist}>
              Netlist (.txt)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void downloadSvg()}>
              Schematic (.svg)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={downloadJson}>
              Circuit (.json)
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="export__empty">Add parts to the board to generate a bill of materials.</p>
          ) : (
            <table className="export__bom">
              <thead>
                <tr>
                  <th>Qty</th>
                  <th>Part</th>
                  <th>Value</th>
                  <th>References</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.key}|${r.value}`}>
                    <td className="export__qty">{r.qty}</td>
                    <td>{r.name}</td>
                    <td className="export__value">{r.value || "—"}</td>
                    <td className="export__refs">{r.refs.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Sheet>
    </>
  );
}
