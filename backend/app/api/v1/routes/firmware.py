"""Firmware compile/validate endpoint for the Code & Flash editor."""
from __future__ import annotations

import re

from fastapi import APIRouter
from pydantic import BaseModel

from app.engines.mcu.sandbox import Firmware, FirmwareError

router = APIRouter(prefix="/firmware", tags=["firmware"])

_LINE = re.compile(r"line (\d+):")


class FirmwareCheckRequest(BaseModel):
    source: str = ""


class FirmwareCheckResponse(BaseModel):
    ok: bool
    error: str | None = None
    line: int | None = None


@router.post("/check", response_model=FirmwareCheckResponse)
async def check(payload: FirmwareCheckRequest) -> FirmwareCheckResponse:
    """Parse + validate firmware the same way the MCU engine does, without running it."""
    try:
        Firmware(payload.source)
    except FirmwareError as exc:
        message = str(exc)
        match = _LINE.match(message)
        return FirmwareCheckResponse(
            ok=False, error=message, line=int(match.group(1)) if match else None
        )
    return FirmwareCheckResponse(ok=True)
