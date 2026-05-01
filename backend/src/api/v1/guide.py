from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import GuideSession
from src.schemas.domain import GuideSessionCreate, GuideSessionRead, GuideSessionUpdate

router = APIRouter(prefix="/guide", tags=["guide"])
guide_dep = Depends(require_any_role("guide", "dispatcher", "manager", "admin", "superuser"))


@router.get("/sessions", response_model=list[GuideSessionRead], dependencies=[guide_dep])
async def list_sessions(db: DBDep) -> list[GuideSession]:
    result = await db.session.execute(select(GuideSession).order_by(GuideSession.session_date, GuideSession.start_time))
    return list(result.scalars().all())


@router.get("/excursions/{excursion_id}/sessions", response_model=list[GuideSessionRead])
async def list_public_excursion_sessions(db: DBDep, excursion_id: int) -> list[GuideSession]:
    result = await db.session.execute(
        select(GuideSession)
        .where(GuideSession.excursion_id == excursion_id, GuideSession.status.in_(["scheduled", "active"]))
        .order_by(GuideSession.session_date, GuideSession.start_time)
    )
    return list(result.scalars().all())


@router.post("/sessions", response_model=GuideSessionRead, dependencies=[guide_dep])
async def create_session(db: DBDep, data: GuideSessionCreate) -> GuideSession:
    session = GuideSession(**data.model_dump())
    db.session.add(session)
    await db.commit()
    await db.session.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=GuideSessionRead, dependencies=[guide_dep])
async def get_session(db: DBDep, session_id: int) -> GuideSession:
    session = await db.session.get(GuideSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.put("/sessions/{session_id}", response_model=GuideSessionRead, dependencies=[guide_dep])
async def update_session(db: DBDep, session_id: int, data: GuideSessionUpdate) -> GuideSession:
    session = await db.session.get(GuideSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(session, key, value)
    await db.commit()
    await db.session.refresh(session)
    return session


@router.delete("/sessions/{session_id}", dependencies=[guide_dep])
async def delete_session(db: DBDep, session_id: int) -> dict[str, str]:
    session = await db.session.get(GuideSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.session.delete(session)
    await db.commit()
    return {"detail": "Session deleted"}
