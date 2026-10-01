from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import BufferDep, SimulationServiceDep
from app.core.exceptions import DomainError
from app.schemas.simulation import SimulationRequest, SimulationResult

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/engines")
async def list_engines(service: SimulationServiceDep) -> dict[str, list[str]]:
    return {"engines": service.engines()}


@router.post("/run", response_model=SimulationResult)
async def run_simulation(
    payload: SimulationRequest,
    service: SimulationServiceDep,
    buffer: BufferDep,
) -> SimulationResult:
    try:
        outcome = await run_in_threadpool(
            service.run, payload.circuit, engine=payload.engine, options=payload.options
        )
    except DomainError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    await buffer.push("simulation", outcome)
    return SimulationResult(**outcome)
