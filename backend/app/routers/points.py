from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_rules
from app.db import get_db
from app.models import PointCategory, PointOfInterest
from app.permissions import POINTS_MANAGE
from app.schemas import (
    OverpassImportRequest,
    PointCategoryCreate,
    PointCategoryOut,
    PointCategoryUpdate,
    PointOfInterestCreate,
    PointOfInterestOut,
    PointOfInterestUpdate,
)
from app.services.osm_import_service import OSMImportService, OverpassImportError

router = APIRouter(prefix="/api/points", tags=["points"])


@router.get("/categories", response_model=list[PointCategoryOut])
def list_categories(db: Session = Depends(get_db)) -> list[PointCategoryOut]:
    return db.query(PointCategory).order_by(PointCategory.name.asc()).all()


@router.post("/categories", response_model=PointCategoryOut)
def create_category(
    payload: PointCategoryCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> PointCategoryOut:
    exists = db.query(PointCategory).filter(PointCategory.name == payload.name).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория уже существует")
    item = PointCategory(name=payload.name, description=payload.description)
    db.add(item)
    log_action(db, user, "point_category_create", {"name": payload.name})
    db.commit()
    db.refresh(item)
    return item


@router.patch("/categories/{category_id}", response_model=PointCategoryOut)
def update_category(
    category_id: int,
    payload: PointCategoryUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> PointCategoryOut:
    item = db.query(PointCategory).filter(PointCategory.id == category_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    log_action(db, user, "point_category_update", {"category_id": item.id})
    db.commit()
    db.refresh(item)
    return item


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> dict:
    item = db.query(PointCategory).filter(PointCategory.id == category_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    db.delete(item)
    log_action(db, user, "point_category_delete", {"category_id": category_id})
    db.commit()
    return {"status": "ok"}


@router.get("/", response_model=list[PointOfInterestOut])
def list_points(
    search: str | None = None,
    category_id: int | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> list[PointOfInterestOut]:
    query = db.query(PointOfInterest)
    if not include_inactive:
        query = query.filter(PointOfInterest.active.is_(True))
    if category_id:
        query = query.filter(PointOfInterest.category_id == category_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                PointOfInterest.name.ilike(like),
                PointOfInterest.short_description.ilike(like),
                PointOfInterest.full_description.ilike(like),
            )
        )
    return query.order_by(PointOfInterest.name.asc()).all()


@router.post("/", response_model=PointOfInterestOut)
def create_point(
    payload: PointOfInterestCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> PointOfInterestOut:
    item = PointOfInterest(**payload.model_dump())
    db.add(item)
    log_action(db, user, "poi_create", {"name": payload.name})
    db.commit()
    db.refresh(item)
    return item


@router.post("/import/overpass")
def import_overpass(
    payload: OverpassImportRequest,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> dict:
    try:
        candidates = OSMImportService().fetch_candidates(
            south=payload.south,
            west=payload.west,
            north=payload.north,
            east=payload.east,
            limit=payload.limit,
        )
    except OverpassImportError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    categories_by_name = {category.name: category for category in db.query(PointCategory).all()}
    created: list[PointOfInterest] = []
    skipped = 0
    for candidate in candidates:
        category_name = candidate.pop("category_name")
        category = categories_by_name.get(category_name)
        if not category:
            category = PointCategory(name=category_name)
            db.add(category)
            db.flush()
            categories_by_name[category_name] = category
        exists = (
            db.query(PointOfInterest)
            .filter(
                PointOfInterest.name == candidate["name"],
                PointOfInterest.lat == candidate["lat"],
                PointOfInterest.lon == candidate["lon"],
            )
            .first()
        )
        if exists:
            skipped += 1
            continue
        item = PointOfInterest(category_id=category.id, **candidate)
        item.active = payload.activate
        db.add(item)
        created.append(item)

    log_action(db, user, "poi_import_overpass", {"created": len(created), "skipped": skipped})
    db.commit()
    for item in created:
        db.refresh(item)
    return {
        "created": [PointOfInterestOut.model_validate(item).model_dump(mode="json") for item in created],
        "created_count": len(created),
        "skipped_count": skipped,
    }


@router.get("/{point_id}", response_model=PointOfInterestOut)
def get_point(point_id: int, db: Session = Depends(get_db)) -> PointOfInterestOut:
    item = db.query(PointOfInterest).filter(PointOfInterest.id == point_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Точка интереса не найдена")
    return item


@router.patch("/{point_id}", response_model=PointOfInterestOut)
def update_point(
    point_id: int,
    payload: PointOfInterestUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> PointOfInterestOut:
    item = db.query(PointOfInterest).filter(PointOfInterest.id == point_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Точка интереса не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    log_action(db, user, "poi_update", {"point_id": item.id})
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{point_id}")
def delete_point(
    point_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(POINTS_MANAGE)),
) -> dict:
    item = db.query(PointOfInterest).filter(PointOfInterest.id == point_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Точка интереса не найдена")
    item.active = False
    log_action(db, user, "poi_archive", {"point_id": item.id})
    db.commit()
    return {"status": "ok"}
