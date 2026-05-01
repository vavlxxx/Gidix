from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import get_current_user, require_rules
from app.db import get_db
from app.models import ExcursionSession
from app.permissions import GUIDE_ASSIGNMENTS_VIEW
from app.schemas import ExcursionSessionOut

router = APIRouter(prefix="/api/guide", tags=["guide"])


@router.get("/sessions", response_model=list[ExcursionSessionOut])
def list_my_sessions(
    include_past: bool = False,
    db: Session = Depends(get_db),
    user=Depends(require_rules(GUIDE_ASSIGNMENTS_VIEW)),
) -> list[ExcursionSessionOut]:
    query = db.query(ExcursionSession).filter(ExcursionSession.guide_user_id == user.id)
    if not include_past:
        query = query.filter(ExcursionSession.starts_at >= datetime.utcnow())
    return query.order_by(ExcursionSession.starts_at.asc()).all()


@router.get("/sessions/{session_id}/task")
def get_route_task(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(GUIDE_ASSIGNMENTS_VIEW)),
) -> dict:
    session = (
        db.query(ExcursionSession)
        .filter(ExcursionSession.id == session_id, ExcursionSession.guide_user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сеанс не найден")
    route_link = session.excursion.route_links[0] if session.excursion.route_links else None
    route = route_link.route if route_link else None
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрутное задание не найдено")
    return {
        "session_id": session.id,
        "excursion_title": session.excursion.title,
        "starts_at": session.starts_at,
        "route": {
            "id": route.id,
            "title": route.title,
            "description": route.description,
            "estimated_duration_min": route.estimated_duration_min,
            "estimated_length_km": route.estimated_length_km,
            "geometry_geojson": route.geometry_geojson,
            "points": [
                {
                    "order_number": point.order_index + 1,
                    "name": point.title,
                    "description": point.description,
                    "lat": point.lat,
                    "lon": point.lng,
                    "visit_minutes": point.visit_minutes,
                }
                for point in sorted(route.points, key=lambda item: item.order_index)
            ],
        },
    }


@router.post("/sessions/{session_id}/complete", response_model=ExcursionSessionOut)
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(GUIDE_ASSIGNMENTS_VIEW)),
) -> ExcursionSessionOut:
    session = (
        db.query(ExcursionSession)
        .filter(ExcursionSession.id == session_id, ExcursionSession.guide_user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сеанс не найден")
    session.completed_at = datetime.utcnow()
    log_action(db, user, "guide_session_complete", {"session_id": session.id})
    db.commit()
    db.refresh(session)
    return session
