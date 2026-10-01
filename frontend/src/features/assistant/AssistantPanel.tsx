import { useEffect, useRef, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { assistantService, errorMessage } from "../../services";
import type { ChatMessage } from "../../services/assistant.service";
import { useCircuitActions, useCircuitGraph } from "../board/CircuitGraphContext";

const IDEAS = [
  "Build a 10V voltage divider with 6.8k and 3.3k",
  "Light an LED from 5V through a 330 ohm resistor",
  "Make a 4-bit counter driven by a clock",
  "Add a push button that switches the LED",
];

export function AssistantPanel() {
  const { circuit } = useCircuitGraph();
  const { loadCircuit } = useCircuitActions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    assistantService
      .status()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await assistantService.chat(next, circuit);
      setConfigured(res.configured);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.circuit && res.circuit.instances.length > 0) loadCircuit(res.circuit);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${errorMessage(e)}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="assistant">
      {configured === false && (
        <div className="assistant__badge">AI not configured — set OPENAI_API_KEY on the backend</div>
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
          {messages.map((m, i) => (
            <div key={i} className={`assistant__msg assistant__msg--${m.role}`}>
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="assistant__msg assistant__msg--assistant assistant__msg--typing">thinking…</div>
          )}
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
