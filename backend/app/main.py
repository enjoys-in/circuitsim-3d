"""FastAPI application factory.

Serves the frontend build (``dist/``) at ``/`` and the JSON API under
``/v1/api``. Realtime WebSocket lives at ``/v1/api/ws/realtime``.
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.middleware import LocalNetworkMiddleware
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.lifespan import lifespan
from app.core.logging import configure_logging


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    # Wildcard origins cannot be combined with credentials per the CORS spec.
    allow_credentials = "*" not in settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Added last => outermost: answers Private Network Access preflight and
    # enforces the LAN pairing token (localhost stays open).
    prefix = settings.api_v1_prefix
    app.add_middleware(
        LocalNetworkMiddleware,
        lan_enabled=settings.lan_enabled,
        pairing_token=settings.pairing_token,
        public_paths={f"{prefix}/agent/info", f"{prefix}/health"},
    )

    # JSON + WebSocket API under /v1/api
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    # Serve the compiled frontend at "/" when a build is present.
    if os.path.isdir(settings.static_dir):
        app.mount(
            "/",
            StaticFiles(directory=settings.static_dir, html=True),
            name="frontend",
        )

    return app


app = create_app()
