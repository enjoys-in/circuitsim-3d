import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { Skeleton } from "../../shared/ui/Skeleton";

interface Props {
  value: string;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  onChange?: (value: string) => void;
}

// Reusable Monaco wrapper. @monaco-editor/react fetches the editor from a CDN on
// mount, so importing this module lazily keeps Monaco out of the initial bundle.
// If that fetch never resolves (offline / blocked), fall back to a plain textarea
// so firmware always stays editable.
export default function MonacoEditor({ value, language = "python", readOnly, height = "100%", onChange }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => alive && setFailed(true), 8000);
    loader
      .init()
      .then(() => window.clearTimeout(timer))
      .catch(() => {
        window.clearTimeout(timer);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (failed) {
    return (
      <textarea
        className="code-editor__textarea"
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Firmware source"
      />
    );
  }

  return (
    <Editor
      height={height}
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<Skeleton height={220} radius={8} />}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderWhitespace: "selection",
        smoothScrolling: true,
        padding: { top: 10, bottom: 10 },
      }}
    />
  );
}
