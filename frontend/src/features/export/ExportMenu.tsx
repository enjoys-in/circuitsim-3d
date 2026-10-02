import { useMemo, useRef, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { usePcb } from "../pcb/PcbContext";
import { buildShareUrl } from "../share/shareCircuit";
import { bomToCsv, buildBom, buildNetlist, downloadBlob, downloadText } from "./exporters";
import "./export.css";

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { circuit, nodes, edges } = useCircuitGraph();
  const { loadCircuit } = useCircuitActions();
  const { byKey } = useCatalog();
  const pcb = usePcb();
  const fileRef = useRef<HTMLInputElement>(null);
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
  const printSchematic = async () => {
    const { buildSchematicSvg } = await import("./schematicSvg");
    const svg = buildSchematicSvg(nodes, edges);
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Allow pop-ups to print the schematic.");
      return;
    }
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>CircuitSim schematic</title>` +
        `<style>html,body{margin:0;background:#fff}svg{max-width:100%;height:auto}@page{margin:12mm}</style>` +
        `</head><body>${svg}` +
        `<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script>` +
        `</body></html>`,
    );
    win.document.close();
  };
  const downloadPng = async () => {
    const { buildSchematicSvg } = await import("./schematicSvg");
    const { svgToPngBlob } = await import("./toPng");
    downloadBlob(`circuitsim-schematic-${stamp()}.png`, await svgToPngBlob(buildSchematicSvg(nodes, edges)));
  };
  const downloadGerbers = async () => {
    const { buildGerbers } = await import("./gerber");
    const { zipFiles } = await import("./zip");
    const files = buildGerbers({
      circuit,
      catalog: byKey,
      placements: pcb.placements,
      board: pcb.board,
      traces: pcb.traces,
      vias: pcb.vias,
    });
    downloadBlob(`circuitsim-gerbers-${stamp()}.zip`, zipFiles(files));
  };
  const downloadCentroid = async () => {
    const { buildCentroid } = await import("./centroid");
    const csv = buildCentroid({ circuit, catalog: byKey, placements: pcb.placements, board: pcb.board });
    downloadText(`circuitsim-pick-and-place-${stamp()}.csv`, csv, "text/csv");
  };
  const downloadSpice = async () => {
    const { buildSpice } = await import("./spice");
    downloadText(`circuitsim-${stamp()}.cir`, buildSpice(circuit, byKey), "text/plain");
  };
  const onSpiceFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const { parseSpice } = await import("./spice");
    const imported = parseSpice(text);
    if (imported.instances.length > 0) {
      loadCircuit(imported);
      setOpen(false);
    }
  };
  const shareLink = async () => {
    const url = buildShareUrl(circuit);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this share link:", url);
    }
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
            <Button
              variant="primary"
              size="sm"
              disabled={circuit.instances.length === 0}
              onClick={() => void shareLink()}
            >
              {copied ? "Link copied ✓" : "🔗 Share link"}
            </Button>
            <Button size="sm" disabled={rows.length === 0} onClick={downloadBom}>
              BOM (.csv)
            </Button>
            <Button size="sm" disabled={circuit.nets.length === 0} onClick={downloadNetlist}>
              Netlist (.txt)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void downloadSvg()}>
              Schematic (.svg)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void downloadPng()}>
              Schematic (.png)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void printSchematic()}>
              Print / PDF
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={downloadJson}>
              Circuit (.json)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void downloadGerbers()}>
              Gerbers (.zip)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void downloadCentroid()}>
              Pick &amp; place (.csv)
            </Button>
            <Button size="sm" disabled={circuit.instances.length === 0} onClick={() => void downloadSpice()}>
              SPICE (.cir)
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              Import SPICE (.cir)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".cir,.spice,.net,.sp,.txt"
              hidden
              onChange={(e) => void onSpiceFile(e)}
            />
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
