import { useEffect, useMemo, useState } from "react";
import type { VerifyResponse, VerifyVector } from "../../domain";
import { errorMessage, simulationService } from "../../services";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Sheet } from "../../shared/ui/Sheet";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { toSimulationCircuit } from "../custom/toSimulationCircuit";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import "./verify.css";

const SWEEP_LIMIT = 10; // 2^10 = 1024 rows is the practical ceiling for a full sweep.

interface Port {
  id: string;
  label: string;
}

interface EditRow {
  inputs: Record<string, number>; // input id -> 0 | 1
  expected: Record<string, number>; // output id -> 0 | 1 (omitted = don't care)
}

function blankRow(inputs: Port[]): EditRow {
  return { inputs: Object.fromEntries(inputs.map((p) => [p.id, 0])), expected: {} };
}

function sweepRows(inputs: Port[]): EditRow[] {
  const n = inputs.length;
  const rows: EditRow[] = [];
  for (let combo = 0; combo < 1 << n; combo += 1) {
    const values: Record<string, number> = {};
    inputs.forEach((port, bit) => {
      values[port.id] = (combo >> bit) & 1;
    });
    rows.push({ inputs: values, expected: {} });
  }
  return rows;
}

export function VerifySheet() {
  const { verifyOpen, closeVerify } = useWorkspaceUi();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();

  const simCircuit = useMemo(() => toSimulationCircuit(circuit, byKey), [circuit, byKey]);
  const inputs = useMemo<Port[]>(
    () =>
      simCircuit.instances
        .filter((i) => i.component_key === "input")
        .map((i) => ({ id: i.id, label: i.label || i.id })),
    [simCircuit],
  );
  const outputs = useMemo<Port[]>(
    () =>
      simCircuit.instances
        .filter((i) => i.component_key === "output" || i.component_key === "led")
        .map((i) => ({ id: i.id, label: i.label || i.id })),
    [simCircuit],
  );
  const portKey = useMemo(
    () => `${inputs.map((p) => p.id).join(",")}|${outputs.map((p) => p.id).join(",")}`,
    [inputs, outputs],
  );

  const [rows, setRows] = useState<EditRow[]>([]);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the vector table whenever the set of input/output ports changes.
  useEffect(() => {
    setRows(inputs.length ? [blankRow(inputs)] : []);
    setResult(null);
    setError(null);
  }, [portKey, inputs]);

  const editRows = (next: EditRow[]) => {
    setRows(next);
    setResult(null); // stale once the vectors change
  };

  const toggleInput = (rowIndex: number, id: string) => {
    editRows(
      rows.map((row, i) =>
        i === rowIndex ? { ...row, inputs: { ...row.inputs, [id]: row.inputs[id] ? 0 : 1 } } : row,
      ),
    );
  };

  const cycleExpected = (rowIndex: number, id: string) => {
    editRows(
      rows.map((row, i) => {
        if (i !== rowIndex) return row;
        const expected = { ...row.expected };
        const current = expected[id];
        if (current === undefined) expected[id] = 0;
        else if (current === 0) expected[id] = 1;
        else delete expected[id];
        return { ...row, expected };
      }),
    );
  };

  const addRow = () => editRows([...rows, blankRow(inputs)]);
  const removeRow = (rowIndex: number) => editRows(rows.filter((_, i) => i !== rowIndex));
  const clearRows = () => editRows([blankRow(inputs)]);
  const sweep = () => editRows(sweepRows(inputs));

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const vectors: VerifyVector[] = rows.map((row) => ({
        inputs: row.inputs,
        expected: Object.keys(row.expected).length ? row.expected : null,
      }));
      const response = await simulationService.verify(simCircuit, vectors);
      setResult(response);
    } catch (err) {
      setError(errorMessage(err, "Verification failed"));
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const summary = result
    ? result.failed > 0
      ? { tone: "fail" as const, text: `${result.failed} failing · ${result.passed} passing` }
      : result.passed > 0
        ? { tone: "pass" as const, text: `All ${result.passed} checks passed` }
        : { tone: "neutral" as const, text: `${result.total} vectors run · no expectations set` }
    : null;

  return (
    <Sheet
      open={verifyOpen}
      title="Verify circuit"
      onClose={closeVerify}
      actions={<span className="sheet__soon">truth table / test vectors</span>}
    >
      {inputs.length === 0 ? (
        <EmptyState title="Nothing to verify yet">
          Add <code>input</code> parts (and <code>output</code> probes on the signals you care about),
          then reopen Verify to build a truth table.
        </EmptyState>
      ) : (
        <div className="verify">
          <div className="verify__bar">
            <div className="verify__actions">
              <Button size="sm" onClick={addRow}>+ Row</Button>
              <Button
                size="sm"
                onClick={sweep}
                disabled={inputs.length > SWEEP_LIMIT}
                title={
                  inputs.length > SWEEP_LIMIT
                    ? `Too many inputs to sweep (${inputs.length} > ${SWEEP_LIMIT})`
                    : `Generate all ${1 << inputs.length} input combinations`
                }
              >
                Sweep all ({inputs.length > SWEEP_LIMIT ? "—" : 1 << inputs.length})
              </Button>
              <Button size="sm" onClick={clearRows}>Clear</Button>
            </div>
            <div className="verify__run">
              {summary && <span className={`verify__summary verify__summary--${summary.tone}`}>{summary.text}</span>}
              <Button size="sm" variant="primary" onClick={run} disabled={running || rows.length === 0}>
                {running ? "Running…" : "Run checks"}
              </Button>
            </div>
          </div>

          {outputs.length === 0 && (
            <p className="verify__hint">
              No <code>output</code> probes found — add them on the nets you want to check so results can be
              compared.
            </p>
          )}
          {error && <p className="verify__error">{error}</p>}

          <div className="verify__scroll">
            <table className="verify-table">
              <thead>
                <tr>
                  <th className="verify-table__idx">#</th>
                  {inputs.map((p) => (
                    <th key={p.id} className="verify-table__in" title={p.id}>{p.label}</th>
                  ))}
                  {outputs.map((p) => (
                    <th key={p.id} className="verify-table__out" title={p.id}>{p.label}</th>
                  ))}
                  <th className="verify-table__res">Result</th>
                  <th className="verify-table__del" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const computed = result?.rows[rowIndex];
                  const rowPass = computed?.passed;
                  return (
                    <tr key={rowIndex}>
                      <td className="verify-table__idx">{rowIndex + 1}</td>
                      {inputs.map((p) => (
                        <td key={p.id} className="verify-cell">
                          <button
                            type="button"
                            className={`bit bit--${row.inputs[p.id] ? "hi" : "lo"}`}
                            onClick={() => toggleInput(rowIndex, p.id)}
                          >
                            {row.inputs[p.id]}
                          </button>
                        </td>
                      ))}
                      {outputs.map((p) => {
                        const want = row.expected[p.id];
                        const got = computed?.outputs?.[p.id];
                        const state =
                          want === undefined || got === undefined || got === null
                            ? "none"
                            : got === want
                              ? "ok"
                              : "bad";
                        return (
                          <td key={p.id} className="verify-cell verify-cell--out">
                            <span className={`out-got out-got--${state}`}>
                              {got === undefined || got === null ? "·" : got}
                            </span>
                            <button
                              type="button"
                              className={`exp exp--${want === undefined ? "any" : want ? "hi" : "lo"}`}
                              onClick={() => cycleExpected(rowIndex, p.id)}
                              title="Expected value (click to cycle any / 0 / 1)"
                            >
                              {want === undefined ? "—" : want}
                            </button>
                          </td>
                        );
                      })}
                      <td className="verify-table__res">
                        {rowPass === undefined || rowPass === null ? (
                          <span className="verify-res verify-res--none">—</span>
                        ) : rowPass ? (
                          <span className="verify-res verify-res--pass">✓ pass</span>
                        ) : (
                          <span className="verify-res verify-res--fail">✗ fail</span>
                        )}
                      </td>
                      <td className="verify-table__del">
                        <button
                          type="button"
                          className="verify-del"
                          onClick={() => removeRow(rowIndex)}
                          disabled={rows.length <= 1}
                          aria-label={`Remove row ${rowIndex + 1}`}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Sheet>
  );
}
