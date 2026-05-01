from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from src.api.v1.dependencies.auth import CurrentUser, require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import Review
from src.schemas.domain import ReviewCreate, ReviewRead

router = APIRouter(prefix="/reviews", tags=["reviews"])
admin_dep = Depends(require_any_role("manager", "admin", "superuser"))


@router.get("", response_model=list[ReviewRead])
async def list_reviews(db: DBDep, excursion_id: int | None = None) -> list[Review]:
    query = select(Review).order_by(Review.id.desc())
    if excursion_id is not None:
        query = query.where(Review.excursion_id == excursion_id)
    result = await db.session.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=ReviewRead)
async def create_review(db: DBDep, data: ReviewCreate, user: CurrentUser) -> Review:
    review = Review(**data.model_dump(), user_id=user.id, published=False)
    db.session.add(review)
    await db.commit()
    await db.session.refresh(review)
    return review


@router.post("/{review_id}/publish", response_model=ReviewRead, dependencies=[admin_dep])
async def publish_review(db: DBDep, review_id: int) -> Review:
    review = await db.session.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    review.published = True
    await db.commit()
    await db.session.refresh(review)
    return review
