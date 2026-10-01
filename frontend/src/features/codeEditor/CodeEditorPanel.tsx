import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";

const MonacoEditor = lazy(() => import("./MonacoEditor"));

interface Props {
  title: string;
  value: string;
  fault?: string | null;
  onFlash: (source: string) => void;
}

type ToolState = { kind: "idle" | "ok" | "soon" | "error"; message: string };

const SOON = "Toolchain coming soon — runs in the simulator for now";

export default function CodeEditorPanel({ title, value, fault, onFlash }: Props) {
  const [draft, setDraft] = useState(value);
  const [tool, setTool] = useState<ToolState>({ kind: "idle", message: "" });
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;

  const flash = () => {
    onFlash(draft);
    setTool({ kind: "ok", message: "Flashed — running on the next tick" });
  };

  return (
    <div className="code-editor">
      <div className="code-editor__bar">
        <span className="code-editor__file">{title}.py</span>
        <div className="code-editor__actions">
          <Button size="sm" onClick={() => setTool({ kind: "soon", message: `Test: ${SOON}` })}>
            Test
          </Button>
          <Button size="sm" onClick={() => setTool({ kind: "soon", message: `Build: ${SOON}` })}>
            Build
          </Button>
          <Button size="sm" onClick={() => setTool({ kind: "soon", message: `Compile: ${SOON}` })}>
            Compile
          </Button>
          <Button size="sm" variant="primary" onClick={flash} disabled={!dirty}>
            {dirty ? "Flash" : "Flashed"}
          </Button>
          <Button size="sm" onClick={() => setTool({ kind: "soon", message: `Upload: ${SOON}` })}>
            Upload
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
