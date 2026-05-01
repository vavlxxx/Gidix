from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import get_optional_user, require_rules
from app.db import get_db
from app.models import Booking, BookingStatus, Excursion, ExcursionRoute, ExcursionSession, Photo, Route
from app.permissions import EXCURSIONS_MANAGE, user_has_rule
from app.schemas import (
    BookingCreate,
    BookingOut,
    ExcursionCreate,
    ExcursionListItem,
    ExcursionOut,
    ExcursionRouteOut,
    ExcursionSessionCreate,
    ExcursionSessionOut,
    ExcursionSessionUpdate,
    ExcursionUpdate,
    RouteOut,
)
from app.utils import generate_booking_code

router = APIRouter(prefix="/api/excursions", tags=["excursions"])


def _cover_photo(route: Route | None) -> str | None:
    if not route:
        return None
    for photo in route.photos:
        if photo.is_cover:
            return photo.file_path
    return route.photos[0].file_path if route.photos else None


def _serialize_excursion(item: Excursion) -> ExcursionOut:
    return ExcursionOut(
        id=item.id,
        title=item.title,
        description=item.description,
        base_price=item.base_price,
        max_participants=item.max_participants,
        published=item.published,
        created_at=item.created_at,
        updated_at=item.updated_at,
        routes=[
            ExcursionRouteOut(
                id=link.id,
                route_id=link.route_id,
                order_number=link.order_number,
                route=RouteOut.model_validate(link.route) if link.route else None,
            )
            for link in item.route_links
        ],
        media=item.media,
    )


def _sync_routes(db: Session, excursion: Excursion, route_ids: list[int]) -> None:
    routes = db.query(Route).filter(Route.id.in_(route_ids)).all() if route_ids else []
    if len(routes) != len(set(route_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некоторые маршруты не найдены")
    excursion.route_links.clear()
    for index, route_id in enumerate(route_ids):
        excursion.route_links.append(ExcursionRoute(route_id=route_id, order_number=index))


@router.get("/", response_model=list[ExcursionListItem])
def list_excursions(
    include_unpublished: bool = False,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[ExcursionListItem]:
    query = db.query(Excursion)
    if include_unpublished:
        if not user or not user_has_rule(db, user, EXCURSIONS_MANAGE):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    else:
        query = query.filter(Excursion.published.is_(True))
    items = query.order_by(Excursion.created_at.desc()).all()
    result = []
    for item in items:
        first_route = item.route_links[0].route if item.route_links else None
        result.append(
            ExcursionListItem(
                id=item.id,
                title=item.title,
                description=item.description,
                base_price=item.base_price,
                max_participants=item.max_participants,
                published=item.published,
                route_count=len(item.route_links),
                cover_photo=_cover_photo(first_route),
            )
        )
    return result


@router.get("/{excursion_id}", response_model=ExcursionOut)
def get_excursion(
    excursion_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> ExcursionOut:
    item = db.query(Excursion).filter(Excursion.id == excursion_id).first()
    if not item or (not item.published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Экскурсия не найдена")
    return _serialize_excursion(item)


@router.get("/{excursion_id}/route", response_model=RouteOut)
def get_excursion_route(excursion_id: int, db: Session = Depends(get_db)) -> RouteOut:
    link = (
        db.query(ExcursionRoute)
        .join(Excursion, Excursion.id == ExcursionRoute.excursion_id)
        .filter(Excursion.id == excursion_id, Excursion.published.is_(True))
        .order_by(ExcursionRoute.order_number.asc())
        .first()
    )
    if not link or not link.route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут экскурсии не найден")
    return RouteOut.model_validate(link.route)


@router.post("/", response_model=ExcursionOut)
def create_excursion(
    payload: ExcursionCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(EXCURSIONS_MANAGE)),
) -> ExcursionOut:
    item = Excursion(
        title=payload.title,
        description=payload.description,
        base_price=payload.base_price,
        max_participants=payload.max_participants,
        published=payload.published,
    )
    db.add(item)
    db.flush()
    _sync_routes(db, item, payload.route_ids)
    log_action(db, user, "excursion_create", {"excursion_id": item.id})
    db.commit()
    db.refresh(item)
    return _serialize_excursion(item)


@router.patch("/{excursion_id}", response_model=ExcursionOut)
def update_excursion(
    excursion_id: int,
    payload: ExcursionUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(EXCURSIONS_MANAGE)),
) -> ExcursionOut:
    item = db.query(Excursion).filter(Excursion.id == excursion_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Экскурсия не найдена")
    data = payload.model_dump(exclude_unset=True)
    route_ids = data.pop("route_ids", None)
    for field, value in data.items():
        setattr(item, field, value)
    if route_ids is not None:
        _sync_routes(db, item, route_ids)
    log_action(db, user, "excursion_update", {"excursion_id": item.id})
    db.commit()
    db.refresh(item)
    return _serialize_excursion(item)


@router.delete("/{excursion_id}")
def archive_excursion(
    excursion_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(EXCURSIONS_MANAGE)),
) -> dict:
    item = db.query(Excursion).filter(Excursion.id == excursion_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Экскурсия не найдена")
    item.published = False
    log_action(db, user, "excursion_archive", {"excursion_id": item.id})
    db.commit()
    return {"status": "ok"}


@router.get("/{excursion_id}/sessions", response_model=list[ExcursionSessionOut])
def list_sessions(
    excursion_id: int,
    include_past: bool = False,
    db: Session = Depends(get_db),
) -> list[ExcursionSessionOut]:
    query = db.query(ExcursionSession).filter(ExcursionSession.excursion_id == excursion_id)
    if not include_past:
        query = query.filter(ExcursionSession.starts_at >= datetime.utcnow())
    return query.order_by(ExcursionSession.starts_at.asc()).all()


@router.post("/{excursion_id}/sessions", response_model=ExcursionSessionOut)
def create_session(
    excursion_id: int,
    payload: ExcursionSessionCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(EXCURSIONS_MANAGE)),
) -> ExcursionSessionOut:
    excursion = db.query(Excursion).filter(Excursion.id == excursion_id).first()
    if not excursion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Экскурсия не найдена")
    session = ExcursionSession(
        excursion_id=excursion_id,
        guide_user_id=payload.guide_user_id,
        starts_at=payload.starts_at,
    )
    db.add(session)
    log_action(db, user, "excursion_session_create", {"excursion_id": excursion_id})
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{excursion_id}/sessions/{session_id}", response_model=ExcursionSessionOut)
def update_session(
    excursion_id: int,
    session_id: int,
    payload: ExcursionSessionUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(EXCURSIONS_MANAGE)),
) -> ExcursionSessionOut:
    session = (
        db.query(ExcursionSession)
        .filter(ExcursionSession.id == session_id, ExcursionSession.excursion_id == excursion_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сеанс не найден")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    log_action(db, user, "excursion_session_update", {"session_id": session.id})
    db.commit()
    db.refresh(session)
    return session


@router.post("/{excursion_id}/bookings", response_model=BookingOut)
def create_excursion_booking(
    excursion_id: int,
    payload: BookingCreate,
    db: Session = Depends(get_db),
) -> BookingOut:
    excursion = db.query(Excursion).filter(Excursion.id == excursion_id, Excursion.published.is_(True)).first()
    if not excursion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Экскурсия не найдена")
    link = excursion.route_links[0] if excursion.route_links else None
    if not link:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="К экскурсии не привязан маршрут")
    booking = Booking(
        code=generate_booking_code(db),
        route_id=link.route_id,
        client_name=payload.client_name,
        phone=payload.phone,
        client_phone=payload.phone,
        email=payload.email,
        client_email=payload.email,
        desired_date=payload.desired_date,
        participants=payload.participants,
        participants_count=payload.participants,
        comment=payload.comment,
        status=BookingStatus.new,
        booking_status=BookingStatus.new,
    )
    db.add(booking)
    log_action(db, None, "excursion_booking_create", {"excursion_id": excursion_id})
    db.commit()
    db.refresh(booking)
    return booking
