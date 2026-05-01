from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import GuideSession
from src.schemas.domain import GuideSessionCreate, GuideSessionRead

router = APIRouter(prefix="/guide", tags=["guide"])
guide_dep = Depends(require_any_role("guide", "dispatcher", "manager", "admin", "superuser"))


@router.get("/sessions", response_model=list[GuideSessionRead], dependencies=[guide_dep])
async def list_sessions(db: DBDep) -> list[GuideSession]:
    result = await db.session.execute(select(GuideSession).order_by(GuideSession.session_date, GuideSession.start_time))
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
