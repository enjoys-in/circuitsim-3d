import Editor from "@monaco-editor/react";
import { Skeleton } from "../../shared/ui/Skeleton";

interface Props {
  value: string;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  onChange?: (value: string) => void;
}

// Reusable Monaco wrapper. @monaco-editor/react fetches the editor on mount,
// so importing this module lazily keeps Monaco out of the initial bundle.
export default function MonacoEditor({ value, language = "python", readOnly, height = "100%", onChange }: Props) {
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
