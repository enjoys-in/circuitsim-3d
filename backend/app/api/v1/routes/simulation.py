from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import BufferDep, SimulationServiceDep
from app.core.exceptions import DomainError
from app.schemas.simulation import (
    AcRequest,
    AcResponse,
    SimulationRequest,
    SimulationResult,
    SweepRequest,
    SweepResponse,
    VerifyRequest,
    VerifyResponse,
)

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


@router.post("/verify", response_model=VerifyResponse)
async def verify_circuit(
    payload: VerifyRequest,
    service: SimulationServiceDep,
) -> VerifyResponse:
    vectors = [{"inputs": v.inputs, "expected": v.expected} for v in payload.vectors]
    try:
        outcome = await run_in_threadpool(
            service.verify,
            payload.circuit,
            vectors,
            engine=payload.engine,
            options=payload.options,
        )
    except DomainError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return VerifyResponse(**outcome)


@router.post("/sweep", response_model=SweepResponse)
async def sweep_circuit(
    payload: SweepRequest,
    service: SimulationServiceDep,
) -> SweepResponse:
    try:
        outcome = await run_in_threadpool(
            service.sweep,
            payload.circuit,
            instance=payload.instance,
            param=payload.param,
            start=payload.start,
            stop=payload.stop,
            steps=payload.steps,
            options=payload.options,
        )
    except DomainError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return SweepResponse(**outcome)


@router.post("/ac", response_model=AcResponse)
async def ac_circuit(
    payload: AcRequest,
    service: SimulationServiceDep,
) -> AcResponse:
    try:
        outcome = await run_in_threadpool(
            service.ac,
            payload.circuit,
            start_hz=payload.start_hz,
            stop_hz=payload.stop_hz,
            points=payload.points,
        )
    except DomainError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return AcResponse(**outcome)
