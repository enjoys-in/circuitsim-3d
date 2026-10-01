import { Button } from "../../shared/ui/Button";

const IDEAS = [
  "“Add a BME280 and blink an LED when it's hot”",
  "“Explain why my LED has no current”",
  "“Turn this into a 4-bit counter”",
  "“Write firmware to sweep the servo”",
];

export function AssistantPanel() {
  return (
    <div className="assistant">
      <div className="assistant__badge">AI agent · coming soon</div>
      <p className="assistant__lead">
        Describe a circuit or a change in plain English and the agent will build it, wire it, run the simulation and
        explain the result — right here on the board.
      </p>
      <ul className="assistant__ideas">
        {IDEAS.map((idea) => (
          <li key={idea}>{idea}</li>
        ))}
      </ul>
      <div className="assistant__composer">
        <textarea
          className="assistant__input"
          rows={3}
          disabled
          placeholder="Ask the agent to build or change your circuit…"
        />
        <Button variant="primary" size="sm" disabled title="Coming soon">
          Send
        </Button>
      </div>
      <p className="assistant__note">Wiring for a live agent (and MCP tools) is planned — parked for now.</p>
    </div>
  );
}
