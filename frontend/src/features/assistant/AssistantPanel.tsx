import { useEffect, useRef, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import { assistantService, errorMessage } from "../../services";
import type { ChatMessage, ProviderOption } from "../../services/assistant.service";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";

const IDEAS = [
  "Build a 10V voltage divider with 6.8k and 3.3k",
  "Light an LED from 5V through a 330 ohm resistor",
  "Make a 4-bit counter driven by a clock",
  "Add a push button that switches the LED",
];

interface Selection {
  provider: string;
  model: string;
}

export function AssistantPanel() {
  const { circuit } = useCircuitGraph();
  const { loadCircuit } = useCircuitActions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [sel, setSel] = usePersistentState<Selection>("circuitsim.assistant.model", {
    provider: "",
    model: "",
  });
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    assistantService
      .providers()
      .then((s) => {
        setConfigured(s.configured);
        setProviders(s.providers);
        setSel((cur) => {
          const names = s.providers.map((p) => p.name);
          const provider = cur.provider && names.includes(cur.provider) ? cur.provider : s.provider ?? names[0] ?? "";
          const picked = s.providers.find((p) => p.name === provider);
          const model = cur.provider === provider && cur.model ? cur.model : picked?.default_model ?? s.model ?? "";
          return { provider, model };
        });
      })
      .catch(() => setConfigured(false));
  }, [setSel]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  const activeProvider = providers.find((p) => p.name === sel.provider);
  const chooseProvider = (name: string) => {
    const picked = providers.find((p) => p.name === name);
    setSel({ provider: name, model: picked?.default_model ?? "" });
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    // Append an empty assistant bubble to type the streamed reply into.
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const appendToLast = (fn: (prev: string) => string) =>
      setMessages((m) => {
        const copy = m.slice();
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: fn(last.content) };
        return copy;
      });
    try {
      await assistantService.chatStream(
        next,
        circuit,
        { provider: sel.provider || null, model: sel.model || null },
        {
          onToken: (t) => appendToLast((prev) => prev + t),
          onDone: (res) => {
            setConfigured(res.configured);
            appendToLast((prev) => res.reply || prev);
            if (res.circuit && res.circuit.instances.length > 0) loadCircuit(res.circuit);
          },
        },
      );
    } catch (e) {
      appendToLast((prev) => prev || `Error: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="assistant">
      {configured === false && (
        <div className="assistant__badge">
          AI not configured — add a provider key (e.g. GROQ_API_KEY) to the backend .env
        </div>
      )}
      {configured && providers.length > 0 && (
        <div className="assistant__badge assistant__badge--ok">AI ready — {sel.provider} · {sel.model}</div>
      )}

      {configured && providers.length > 0 && (
        <div className="assistant__models">
          <label className="assistant__model-field">
            <span>Provider</span>
            <select
              className="assistant__select"
              value={sel.provider}
              disabled={busy}
              onChange={(e) => chooseProvider(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="assistant__model-field">
            <span>Model</span>
            <input
              className="assistant__select"
              list="assistant-model-options"
              value={sel.model}
              disabled={busy}
              placeholder={activeProvider?.default_model}
              onChange={(e) => setSel((cur) => ({ ...cur, model: e.target.value }))}
            />
            <datalist id="assistant-model-options">
              {(activeProvider?.models ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
        </div>
      )}

      {messages.length === 0 ? (
        <>
          <p className="assistant__lead">
            Describe a circuit or a change in plain English — the agent builds it, wires it, runs the
            simulation and drops it on your board.
          </p>
          <ul className="assistant__ideas">
            {IDEAS.map((idea) => (
              <li key={idea}>
                <button type="button" className="assistant__idea" onClick={() => send(idea)} disabled={busy}>
                  {idea}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="assistant__thread" ref={threadRef}>
          {messages.map((m, i) => {
            const typing =
              busy && i === messages.length - 1 && m.role === "assistant" && m.content === "";
            return (
              <div
                key={i}
                className={`assistant__msg assistant__msg--${m.role}${typing ? " assistant__msg--typing" : ""}`}
              >
                {m.content || (typing ? "thinking\u2026" : "")}
              </div>
            );
          })}
        </div>
      )}

      <div className="assistant__composer">
        <textarea
          className="assistant__input"
          rows={2}
          value={input}
          placeholder="Ask the agent to build or change your circuit…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Button variant="primary" size="sm" disabled={busy || !input.trim()} onClick={() => void send(input)}>
          {busy ? "…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
