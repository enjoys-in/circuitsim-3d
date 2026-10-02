import { useEffect, useRef, useState } from "react";
import type { SimulationOutput } from "../../domain";
import { Button } from "../../shared/ui/Button";
import { usePersistentState } from "../../shared/hooks/usePersistentState";
import { assistantService, errorMessage } from "../../services";
import type { ChatMessage, ProviderOption } from "../../services/assistant.service";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";
import { useSimulation } from "../simulation/SimulationContext";
import { useWorkspaceUi } from "../workspace/WorkspaceUiContext";

const IDEAS = [
  "Build a 10V voltage divider with 6.8k and 3.3k",
  "Light an LED from 5V through a 330 ohm resistor",
  "Make a 4-bit counter driven by a clock",
  "Add a push button that switches the LED",
];

// One-line sim recap fed to the model so "explain" can talk about the real readings.
function circuitSummary(result: SimulationOutput | null): string {
  if (!result) return "";
  const parts = [`engine=${result.engine}`];
  const measures = result.summary.slice(0, 6).map((s) => `${s.label}=${s.value}${s.unit ?? ""}`);
  if (measures.length) parts.push(`readings: ${measures.join(", ")}`);
  if (result.warnings.length) parts.push(`warnings: ${result.warnings.join("; ")}`);
  return parts.join(" | ");
}

// A thread message that may be local-only (shown but never sent to the model, e.g. /compact notes).
type PanelMessage = ChatMessage & { local?: boolean };

interface Selection {
  provider: string;
  model: string;
}

export function AssistantPanel() {
  const { circuit } = useCircuitGraph();
  const { loadCircuit } = useCircuitActions();
  const { result } = useSimulation();
  const { assistantAction, clearAssistantAction } = useWorkspaceUi();
  const [messages, setMessages] = useState<PanelMessage[]>([]);
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
  const warnings = result?.warnings ?? [];
  const chooseProvider = (name: string) => {
    const picked = providers.find((p) => p.name === name);
    setSel({ provider: name, model: picked?.default_model ?? "" });
  };

  const runCommand = (raw: string) => {
    const name = raw.slice(1).trim().split(/\s+/)[0].toLowerCase();
    if (name === "compact" || name === "clear" || name === "reset") {
      const n = messages.filter((m) => !m.local).length;
      setMessages([
        {
          role: "assistant",
          local: true,
          content: n
            ? `Compacted \u2014 cleared ${n} message${n === 1 ? "" : "s"} from the context to save tokens. I still see your current circuit, so just keep going.`
            : "Already compact \u2014 there's no chat history to clear.",
        },
      ]);
      return;
    }
    if (name === "help") {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          local: true,
          content:
            "Commands:\n/compact \u2014 clear the chat history to save tokens (your circuit stays).\n/help \u2014 show this.",
        },
      ]);
      return;
    }
    setMessages((m) => [
      ...m,
      { role: "assistant", local: true, content: `Unknown command \u201c/${name}\u201d. Try /compact or /help.` },
    ]);
  };

  const send = async (displayText: string, promptText?: string) => {
    const content = displayText.trim();
    if (!content || busy) return;
    // Slash commands run locally \u2014 no request, no tokens.
    if (content.startsWith("/")) {
      runCommand(content);
      setInput("");
      return;
    }
    const shown: PanelMessage[] = [...messages, { role: "user", content }];
    // Append an empty assistant bubble to type the streamed reply into.
    setMessages([...shown, { role: "assistant", content: "" }]);
    // Only non-local turns go to the model; /compact clears this history to save tokens.
    const history = messages
      .filter((m) => !m.local)
      .map(({ role, content: text }) => ({ role, content: text }));
    const sent: ChatMessage[] = [...history, { role: "user", content: promptText ?? content }];
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
        sent,
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

  const explain = () => {
    const summary = circuitSummary(result);
    const prompt =
      "Explain this circuit in clear, plain language for someone learning electronics: what it " +
      "does overall, how the main parts work together, and what the key readings mean. Keep it to " +
      'a few short sentences. Do NOT change the circuit \u2014 set "design" to null.' +
      (summary ? `\n\nLatest simulation \u2014 ${summary}` : "");
    void send("Explain my circuit", prompt);
  };

  const fix = (warns: string[]) => {
    const list = warns.length ? warns : warnings;
    if (!list.length) return;
    const prompt =
      "The simulation reported these problems:\n- " +
      list.join("\n- ") +
      "\n\nFix the circuit so these go away \u2014 e.g. add a series resistor, change a component " +
      "value, or add a missing ground/supply. Return the COMPLETE corrected design and briefly " +
      "say what you changed.";
    void send(`Fix ${list.length} warning${list.length === 1 ? "" : "s"}`, prompt);
  };

  // Run an Explain/Fix request triggered from the results overview (once per action id).
  const handledAction = useRef(0);
  useEffect(() => {
    if (!assistantAction || assistantAction.id === handledAction.current) return;
    handledAction.current = assistantAction.id;
    if (assistantAction.kind === "explain") explain();
    else fix(assistantAction.warnings ?? []);
    clearAssistantAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantAction]);

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

      {configured !== false && circuit.instances.length > 0 && (
        <div className="assistant__actions">
          <button type="button" className="assistant__action" onClick={explain} disabled={busy}>
            ✦ Explain my circuit
          </button>
          {warnings.length > 0 && (
            <button
              type="button"
              className="assistant__action assistant__action--fix"
              onClick={() => fix(warnings)}
              disabled={busy}
            >
              Fix {warnings.length} warning{warnings.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
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
                className={`assistant__msg assistant__msg--${m.role}${m.local ? " assistant__msg--note" : ""}${typing ? " assistant__msg--typing" : ""}`}
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
          placeholder="Ask to build or change your circuit…  (/compact saves tokens)"
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
