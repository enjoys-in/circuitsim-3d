# CircuitSim Backend

FastAPI backend for the open-source AI electronics simulator.

- **API** under `/v1/api`
- **Realtime WebSocket** at `/v1/api/ws/realtime`
- **Frontend build** (`dist/`) served at `/`
- **Postgres** = durable store (components, projects, runs)
- **SQLite** = realtime fast-store (buffered, flushed every 2-4s)

## Architecture (SOLID, layered)

```
app/
  core/         config, logging, exceptions, lifespan
  db/           SQLAlchemy base, session, models
  domain/       entities + repository/engine interfaces (abstractions)
  repositories/ SQLAlchemy implementations of the interfaces
  services/     business logic (depends only on abstractions)
  engines/      pluggable simulation engines (digital, analog, mcu)
  realtime/     in-memory buffer, SQLite store, flusher, WebSocket hub
  schemas/      Pydantic request/response DTOs
  api/v1/       routes + dependency wiring (composition root)
  seed/         built-in component catalog + idempotent loader
```

Dependency direction: `api -> services -> domain interfaces <- repositories/engines`.

## Simulation engines

The registry picks the first engine whose `supports()` accepts the circuit
(`app/engines/registry.py`). Each is self-contained and shares the netlist and
result builders in `app/engines/`.

- **digital** (`engines/digital/`) — event-style logic: gates, a clock,
  2:1 mux, and D/T/JK flip-flops. Combinational nets settle by fix-point
  iteration; edge-triggered elements advance per tick, so it also produces
  timing waveforms.
- **analog** (`engines/analog/`) — modified nodal analysis with companion
  models. Newton iteration handles the nonlinear devices (diodes, LEDs, BJTs,
  MOSFETs, regulators); backward-Euler gives transient (`analysis="tran"`)
  capacitor/inductor curves. Devices live in `engines/analog/devices/`.
- **mcu** (`engines/mcu/`) — runs board firmware tick-by-tick against the analog
  network. Firmware is a restricted Python subset evaluated in a sandboxed AST
  interpreter (`engines/mcu/sandbox.py`, no imports/attributes/loops, bounded
  steps). Boards and sensor models are data (`boards.py`, `sensors.py`); the
  seed catalog derives board pins and sensor defaults from them.

Simulation options (all optional): `analysis` (`op`|`tran`), `t_stop`, `steps`
for analog transients; `ticks`, `tick_ms` for digital/mcu timing.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -e ".[dev]"
copy .env.example .env          # then edit POSTGRES_DSN
```

## Run

```bash
uvicorn app.main:app --reload
# API docs: http://localhost:8000/docs
```

## Seed the component catalog

The catalog syncs automatically on startup (idempotent upsert). To run it by
hand:

```bash
python -m app.seed.seeder
```

## Tests

```bash
pytest            # engine coverage: digital, analog, mcu + firmware sandbox
```

## Notes

- If Postgres is unavailable at startup, table creation and the catalog sync are
  skipped with a warning so the app still boots (dev convenience).
- Add new engines in `app/engines/` and register them in
  `build_default_registry()` — no caller changes needed (Open/Closed).
