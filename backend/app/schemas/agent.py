"""DTO for the local agent identity/capability response."""
from __future__ import annotations

from pydantic import BaseModel


class AgentInfo(BaseModel):
    name: str
    version: str
    environment: str
    api_prefix: str
    system: dict[str, str]
    engines: list[str]
    native_tools: dict[str, bool]
    features: list[str]
    pairing_required: bool
