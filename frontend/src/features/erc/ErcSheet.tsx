import { useMemo } from "react";
import { Sheet } from "../../shared/ui/Sheet";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useCircuitGraph } from "../board/CircuitGraphContext";
import { useCatalog } from "../catalog/CatalogContext";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";
import { runErc } from "./erc";
import "./erc.css";

export function ErcSheet() {
  const { ercOpen, closeErc } = useWorkspaceUi();
  const { circuit } = useCircuitGraph();
  const { byKey } = useCatalog();

  const issues = useMemo(
    () => (ercOpen ? runErc(circuit, byKey) : []),
    [ercOpen, circuit, byKey],
  );
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <Sheet
      open={ercOpen}
      title="Electrical rule check"
      onClose={closeErc}
      actions={
        <span className="sheet__soon">
          {errors.length} errors · {warnings.length} warnings
        </span>
      }
    >
      {issues.length === 0 ? (
        <EmptyState title="No problems found">
          Every pin is connected, there is a ground reference, and no net has conflicting drivers.
        </EmptyState>
      ) : (
        <ul className="erc">
          {[...errors, ...warnings].map((issue) => (
            <li key={issue.id} className={`erc__item erc__item--${issue.severity}`}>
              <span className="erc__badge">{issue.severity === "error" ? "⛔" : "⚠"}</span>
              <span className="erc__msg">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
