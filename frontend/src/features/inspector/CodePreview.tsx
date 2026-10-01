import { Button } from "../../shared/ui/Button";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";

interface Props {
  value: string;
  fault?: string | null;
}

// Lightweight read-only code view for the sidebar — no Monaco. The full
// editor opens on demand in the Code sheet.
export function CodePreview({ value, fault }: Props) {
  const { openCode } = useWorkspaceUi();
  return (
    <div className="code-preview">
      <div className="code-preview__head">
        <span className="field__label">Firmware</span>
        <Button size="sm" onClick={openCode}>
          Edit in editor
        </Button>
      </div>
      <textarea
        className="code-preview__code"
        readOnly
        rows={8}
        value={value || "# no firmware yet — open the editor to write some"}
        spellCheck={false}
      />
      {fault && <p className="code-preview__fault">⚠ {fault}</p>}
    </div>
  );
}
