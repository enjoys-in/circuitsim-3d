# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------- #
# CircuitSim — multi-stage production image                                    #
#                                                                              #
#   stage 1 (frontend): build the Vite/React app -> static dist/               #
#   stage 2 (deps):     resolve backend deps with Poetry into an in-project venv#
#   stage 3 (runtime):  slim, non-root image serving API + frontend            #
#                                                                              #
# We use python:*-slim (not distroless) on purpose: Poetry-managed deps such   #
# as asyncpg/greenlet/cryptography pull compiled wheels, and the venv must be  #
# built by the exact same interpreter that runs it. Slim keeps the image small #
# while giving us a shell + matching CPython so the copied venv "just works".   #
#                                                                              #
# Build:  docker build -t circuitsim .                                         #
# Run:    docker run --rm -p 8000:8000 circuitsim                              #
# ---------------------------------------------------------------------------- #

# ---- versions (override with --build-arg) --------------------------------- #
ARG PYTHON_VERSION=3.13
ARG BUN_VERSION=1
ARG POETRY_VERSION=2.1.3


# ============================================================================ #
# Stage 1 — build the frontend (Bun)                                           #
# ============================================================================ #
FROM oven/bun:${BUN_VERSION}-slim AS frontend
WORKDIR /app/frontend

# Install deps first for better layer caching (lockfile is committed).
COPY frontend/package.json frontend/package-lock.json ./
RUN bun install

# Build the static bundle into a local dist/ (overrides the dev outDir).
COPY frontend/ ./
RUN bun run build --outDir dist --emptyOutDir


# ============================================================================ #
# Stage 2 — resolve backend dependencies with Poetry                           #
# ============================================================================ #
FROM python:${PYTHON_VERSION}-slim AS deps
ARG POETRY_VERSION
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=true \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN pip install "poetry==${POETRY_VERSION}"

WORKDIR /app
# Only the metadata is needed to install dependencies (project itself is --no-root).
COPY backend/pyproject.toml backend/poetry.lock backend/README.md ./
RUN poetry install --only main --no-root


# ============================================================================ #
# Stage 3 — runtime                                                            #
# ============================================================================ #
FROM python:${PYTHON_VERSION}-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    STATIC_DIR=dist \
    REALTIME_DB_PATH=/app/data/realtime.db

WORKDIR /app

# Run as an unprivileged user.
RUN useradd --create-home --uid 1000 appuser

# Dependencies (venv from the deps stage — same interpreter path, so it's portable).
COPY --from=deps /app/.venv /app/.venv

# Application code and the compiled frontend.
COPY backend/app ./app
COPY backend/README.md ./README.md
COPY --from=frontend /app/frontend/dist ./dist

# Writable spot for the realtime SQLite buffer.
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Liveness check against the public health endpoint (no curl in slim).
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/v1/api/health').read()" || exit 1

# Default: serve the API + frontend. To run the MCP server instead, override:
#   docker run --rm -p 8765:8765 circuitsim \
#     python -m app.mcp.server --transport streamable-http --host 0.0.0.0 --port 8765
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
