import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";
import { errorMessage, firmwareService } from "../../services";

const MonacoEditor = lazy(() => import("./MonacoEditor"));

interface Props {
  title: string;
  value: string;
  fault?: string | null;
  defaultSource?: string;
  onFlash: (source: string) => void;
}

type ToolKind = "idle" | "ok" | "error" | "busy" | "info";
interface ToolState {
  kind: ToolKind;
  message: string;
}

export default function CodeEditorPanel({ title, value, fault, defaultSource, onFlash }: Props) {
  const [draft, setDraft] = useState(value);
  const [tool, setTool] = useState<ToolState>({ kind: "idle", message: "" });
  const [checking, setChecking] = useState(false);
  useEffect(() => setDraft(value), [value]);

  const dirty = draft !== value;
  const canReset = defaultSource !== undefined && draft !== defaultSource;

  const check = async () => {
    setChecking(true);
    setTool({ kind: "busy", message: "Checking firmware…" });
    try {
      const res = await firmwareService.check(draft);
      setTool(
        res.ok
          ? { kind: "ok", message: "Compiles cleanly — no errors" }
          : { kind: "error", message: res.error ?? "Firmware has errors" },
      );
    } catch (e) {
      setTool({ kind: "error", message: errorMessage(e) });
    } finally {
      setChecking(false);
    }
  };

  const flash = async () => {
    // Validate before flashing so broken firmware never silently runs in the sim.
    setChecking(true);
    try {
      const res = await firmwareService.check(draft).catch(() => ({ ok: true, error: null }));
      if (!res.ok) {
        setTool({ kind: "error", message: res.error ?? "Fix the errors before flashing" });
        return;
      }
      onFlash(draft);
      setTool({ kind: "ok", message: "Flashed — running on the next tick" });
    } finally {
      setChecking(false);
    }
  };

  const download = () => {
    const blob = new Blob([draft], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.py`;
    link.click();
    URL.revokeObjectURL(url);
    setTool({ kind: "info", message: `Downloaded ${title}.py` });
  };

  const reset = () => {
    if (defaultSource === undefined) return;
    setDraft(defaultSource);
    setTool({ kind: "info", message: "Reverted to the board's default firmware" });
  };

  return (
    <div className="code-editor">
      <div className="code-editor__bar">
        <span className="code-editor__file">{title}.py</span>
        <div className="code-editor__actions">
          <Button size="sm" onClick={check} disabled={checking}>
            {checking ? "Checking…" : "Check"}
          </Button>
          <Button size="sm" onClick={download}>
            Download
          </Button>
          <Button size="sm" onClick={reset} disabled={!canReset}>
            Reset
          </Button>
          <Button size="sm" variant="primary" onClick={flash} disabled={!dirty || checking}>
            {dirty ? "Flash" : "Flashed"}
          </Button>
        </div>
      </div>
      <div className="code-editor__monaco">
        <Suspense fallback={<Skeleton height={320} radius={8} />}>
          <MonacoEditor value={draft} language="python" onChange={setDraft} />
        </Suspense>
      </div>
      {fault && <p className="code-editor__fault">⚠ {fault}</p>}
      {tool.kind !== "idle" && !fault && (
        <p className={`code-editor__status code-editor__status--${tool.kind}`}>{tool.message}</p>
      )}
    </div>
  );
}
