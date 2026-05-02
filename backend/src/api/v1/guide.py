from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import GuideSession
from src.schemas.domain import GuideSessionCreate, GuideSessionRead, GuideSessionUpdate

router = APIRouter(prefix="/guide", tags=["guide"])
guide_dep = Depends(require_any_role("guide", "dispatcher", "manager", "admin", "superuser"))


@router.get("/sessions", response_model=list[GuideSessionRead], dependencies=[guide_dep])
async def list_sessions(db: DBDep) -> list[GuideSession]:
    result = await db.session.execute(
        select(GuideSession)
        .options(selectinload(GuideSession.bookings))
        .order_by(GuideSession.session_date, GuideSession.start_time)
    )
    sessions = list(result.scalars().all())
    for session in sessions:
        _attach_available_places(session)
    return sessions


@router.get("/excursions/{excursion_id}/sessions", response_model=list[GuideSessionRead])
async def list_public_excursion_sessions(db: DBDep, excursion_id: int) -> list[GuideSession]:
    result = await db.session.execute(
        select(GuideSession)
        .options(selectinload(GuideSession.bookings))
        .where(GuideSession.excursion_id == excursion_id, GuideSession.status.in_(["scheduled", "active"]))
        .order_by(GuideSession.session_date, GuideSession.start_time)
    )
    sessions = list(result.scalars().all())
    for session in sessions:
        _attach_available_places(session)
    return sessions


@router.post("/sessions", response_model=GuideSessionRead, dependencies=[guide_dep])
async def create_session(db: DBDep, data: GuideSessionCreate) -> GuideSession:
    await _ensure_unique_session(db, data.excursion_id, data.session_date, data.start_time)
    session = GuideSession(**data.model_dump())
    db.session.add(session)
    await db.commit()
    await db.session.refresh(session)
    session.available_places = session.capacity
    return session


@router.get("/sessions/{session_id}", response_model=GuideSessionRead, dependencies=[guide_dep])
async def get_session(db: DBDep, session_id: int) -> GuideSession:
    result = await db.session.execute(
        select(GuideSession).options(selectinload(GuideSession.bookings)).where(GuideSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    _attach_available_places(session)
    return session


@router.put("/sessions/{session_id}", response_model=GuideSessionRead, dependencies=[guide_dep])
async def update_session(db: DBDep, session_id: int, data: GuideSessionUpdate) -> GuideSession:
    session = await db.session.get(GuideSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    next_excursion_id = data.excursion_id if data.excursion_id is not None else session.excursion_id
    next_date = data.session_date if data.session_date is not None else session.session_date
    next_time = data.start_time if data.start_time is not None else session.start_time
    await _ensure_unique_session(db, next_excursion_id, next_date, next_time, exclude_id=session_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(session, key, value)
    await db.commit()
    result = await db.session.execute(
        select(GuideSession).options(selectinload(GuideSession.bookings)).where(GuideSession.id == session_id)
    )
    session = result.scalar_one()
    _attach_available_places(session)
    return session


@router.delete("/sessions/{session_id}", dependencies=[guide_dep])
async def delete_session(db: DBDep, session_id: int) -> dict[str, str]:
    session = await db.session.get(GuideSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.session.delete(session)
    await db.commit()
    return {"detail": "Session deleted"}


def _attach_available_places(session: GuideSession) -> None:
    booked = sum(
        booking.participants_count
        for booking in getattr(session, "bookings", [])
        if booking.status not in {"cancelled", "rejected"}
    )
    session.available_places = max(session.capacity - booked, 0)


async def _ensure_unique_session(db: DBDep, excursion_id, session_date, start_time, exclude_id: int | None = None) -> None:
    query = select(GuideSession).where(
        GuideSession.excursion_id == excursion_id,
        GuideSession.session_date == session_date,
        GuideSession.start_time == start_time,
    )
    if exclude_id is not None:
        query = query.where(GuideSession.id != exclude_id)
    result = await db.session.execute(query)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Session time already exists")
