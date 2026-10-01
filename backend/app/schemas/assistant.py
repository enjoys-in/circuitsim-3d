"""DTOs for the AI assistant chat endpoint."""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.entities.project import Circuit


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AssistantRequest(BaseModel):
    messages: list[ChatMessage]
    circuit: Circuit | None = None
    provider: str | None = None
    model: str | None = None


class ProviderOption(BaseModel):
    name: str
    default_model: str
    models: list[str] = Field(default_factory=list)


class AssistantProviders(BaseModel):
    configured: bool = False
    provider: str | None = None
    model: str | None = None
    providers: list[ProviderOption] = Field(default_factory=list)


class AssistantResponse(BaseModel):
    reply: str
    circuit: Circuit | None = None
    configured: bool = True
    issues: list[str] = Field(default_factory=list)
