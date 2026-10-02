import { useState } from "react";

type Radix = "dec" | "hex" | "bin";

const BASE: Record<Radix, number> = { dec: 10, hex: 16, bin: 2 };

function format(n: number, radix: Radix, bits: number): string {
  if (radix === "hex") return n.toString(16).toUpperCase();
  if (radix === "bin") return n.toString(2).padStart(bits, "0");
  return String(n);
}

function toWords(value: unknown, words: number): number[] {
  const arr = Array.isArray(value) ? value : [];
  return Array.from({ length: words }, (_, i) => {
    const n = Number(arr[i]);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  });
}

interface Props {
  words: number;
  bits: number;
  value: unknown;
  onChange: (value: number[]) => void;
}

// A compact memory/program editor for ROM contents: one word per address, entered
// in decimal, hex or binary. Each word is the machine-code the CPU runs at that address.
export function MemoryEditor({ words, bits, value, onChange }: Props) {
  const [radix, setRadix] = useState<Radix>("dec");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const data = toWords(value, words);
  const max = (1 << bits) - 1;

  const commit = (addr: number, raw: string) => {
    const parsed = parseInt(raw.trim(), BASE[radix]);
    const n = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(max, parsed));
    const next = data.slice();
    next[addr] = n;
    onChange(next);
    setDraft((d) => {
      const rest = { ...d };
      delete rest[addr];
      return rest;
    });
  };

  const clearAll = () => {
    onChange(Array.from({ length: words }, () => 0));
    setDraft({});
  };

  return (
    <div className="mem-editor">
      <div className="mem-editor__bar">
        <span className="mem-editor__title">
          Program · {words}×{bits}-bit
        </span>
        <div className="mem-editor__radix">
          {(["dec", "hex", "bin"] as Radix[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`mem-radix ${radix === r ? "mem-radix--on" : ""}`}
              onClick={() => {
                setRadix(r);
                setDraft({});
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
          <button type="button" className="mem-radix" onClick={clearAll} title="Zero every word">
            Clear
          </button>
        </div>
      </div>
      <div className="mem-editor__grid">
        {data.map((word, addr) => (
          <label key={addr} className="mem-cell" title={`address ${addr}`}>
            <span className="mem-cell__addr">{addr}</span>
            <input
              className="mem-cell__input"
              value={draft[addr] ?? format(word, radix, bits)}
              spellCheck={false}
              onChange={(e) => setDraft((d) => ({ ...d, [addr]: e.target.value }))}
              onBlur={(e) => commit(addr, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
