"""Local-network access middleware.

Two jobs for the "browser talks to a local agent" model:
1. Answer the browser's Private Network Access preflight so a page can reach
   this agent on localhost/LAN.
2. When the agent is exposed on the LAN, require a pairing token from
   non-local clients (localhost stays frictionless).
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

LOCAL_HOSTS = frozenset({"127.0.0.1", "::1", "localhost", "testserver"})
PNA_REQUEST_HEADER = "access-control-request-private-network"
PNA_RESPONSE_HEADER = "Access-Control-Allow-Private-Network"
TOKEN_HEADER = "x-circuitsim-token"


class LocalNetworkMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        *,
        lan_enabled: bool,
        pairing_token: str | None,
        public_paths: set[str],
    ) -> None:
        super().__init__(app)
        self._lan_enabled = lan_enabled
        self._token = pairing_token
        self._public_paths = public_paths

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        wants_pna = request.headers.get(PNA_REQUEST_HEADER) == "true"

        if self._blocked(request):
            origin = request.headers.get("origin", "*")
            headers = {"Access-Control-Allow-Origin": origin}
            if wants_pna:
                headers[PNA_RESPONSE_HEADER] = "true"
            return JSONResponse(
                {"detail": "Pairing token required for local-network access"},
                status_code=401,
                headers=headers,
            )

        response: Response = await call_next(request)
        if wants_pna:
            response.headers[PNA_RESPONSE_HEADER] = "true"
        return response

    def _blocked(self, request: Request) -> bool:
        if not (self._lan_enabled and self._token):
            return False
        if request.method == "OPTIONS":
            return False
        host = request.client.host if request.client else ""
        if host in LOCAL_HOSTS:
            return False
        if request.url.path in self._public_paths:
            return False
        return request.headers.get(TOKEN_HEADER) != self._token
