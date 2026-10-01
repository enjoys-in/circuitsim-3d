#!/usr/bin/env bash
#
# CircuitSim launcher
#   ./run.sh            start backend + frontend (dev, hot reload)
#   ./run.sh backend    backend only  (uvicorn --reload)
#   ./run.sh frontend   frontend only (vite dev)
#   ./run.sh build      build frontend -> backend/dist, then serve via backend
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

# Resolve the backend venv interpreter (Windows Scripts/ or POSIX bin/).
if [[ -x "$BACKEND/.venv/Scripts/python.exe" ]]; then
  PY="$BACKEND/.venv/Scripts/python.exe"
elif [[ -x "$BACKEND/.venv/bin/python" ]]; then
  PY="$BACKEND/.venv/bin/python"
else
  echo "✖ Backend venv missing. Set it up first:" >&2
  echo "    cd backend && python -m venv .venv && python3.13 -m poetry install" >&2
  exit 1
fi

pids=()

cleanup() {
  echo ""
  echo "⏹  Stopping…"
  for pid in "${pids[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM

start_backend() {
  echo "▶ Backend  → http://localhost:$BACKEND_PORT  (API: /v1/api, docs: /docs)"
  # Only watch source; watching .venv/data causes reload churn.
  ( cd "$BACKEND" && "$PY" -m uvicorn app.main:app \
      --host "$BACKEND_HOST" --port "$BACKEND_PORT" \
      --reload --reload-dir app ) &
  pids+=("$!")
}

start_frontend() {
  command -v npm >/dev/null 2>&1 || { echo "✖ npm not found on PATH" >&2; exit 1; }
  [[ -d "$FRONTEND/node_modules" ]] || ( cd "$FRONTEND" && npm install )
  echo "▶ Frontend → http://localhost:5173  (proxies /v1/api → :$BACKEND_PORT)"
  ( cd "$FRONTEND" && npm run dev ) &
  pids+=("$!")
}

build_frontend() {
  command -v npm >/dev/null 2>&1 || { echo "✖ npm not found on PATH" >&2; exit 1; }
  [[ -d "$FRONTEND/node_modules" ]] || ( cd "$FRONTEND" && npm install )
  echo "▶ Building frontend → backend/dist"
  ( cd "$FRONTEND" && npm run build )
}

case "${1:-dev}" in
  backend)  start_backend ;;
  frontend) start_frontend ;;
  build)    build_frontend; start_backend ;;
  dev)      start_backend; start_frontend ;;
  *)
    echo "Usage: ./run.sh [dev|backend|frontend|build]" >&2
    exit 1
    ;;
esac

wait
