from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import CurrentUser, require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import Booking, GuideSession, Review
from src.schemas.domain import ReviewCreate, ReviewRead

router = APIRouter(prefix="/reviews", tags=["reviews"])
admin_dep = Depends(require_any_role("manager", "admin", "superuser"))


@router.get("", response_model=list[ReviewRead])
async def list_reviews(db: DBDep, excursion_id: int | None = None) -> list[Review]:
    query = select(Review).options(selectinload(Review.excursion)).where(Review.published.is_(True)).order_by(Review.id.desc())
    if excursion_id is not None:
        query = query.where(Review.excursion_id == excursion_id)
    result = await db.session.execute(query)
    reviews = list(result.scalars().all())
    for review in reviews:
        _attach_review_view_fields(review)
    return reviews


@router.get("/moderation", response_model=list[ReviewRead], dependencies=[admin_dep])
async def list_reviews_for_moderation(db: DBDep, excursion_id: int | None = None) -> list[Review]:
    query = select(Review).options(selectinload(Review.excursion)).order_by(Review.id.desc())
    if excursion_id is not None:
        query = query.where(Review.excursion_id == excursion_id)
    result = await db.session.execute(query)
    reviews = list(result.scalars().all())
    for review in reviews:
        _attach_review_view_fields(review)
    return reviews


@router.get("/me", response_model=list[ReviewRead])
async def list_my_reviews(db: DBDep, user: CurrentUser) -> list[Review]:
    result = await db.session.execute(
        select(Review).options(selectinload(Review.excursion)).where(Review.user_id == user.id).order_by(Review.id.desc())
    )
    reviews = list(result.scalars().all())
    for review in reviews:
        _attach_review_view_fields(review)
    return reviews


@router.post("", response_model=ReviewRead)
async def create_review(db: DBDep, data: ReviewCreate, user: CurrentUser) -> Review:
    existing = await db.session.scalar(
        select(Review.id).where(Review.user_id == user.id, Review.excursion_id == data.excursion_id).limit(1)
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Review already exists")
    if not await _user_can_review_excursion(db, user.id, data.excursion_id):
        raise HTTPException(status_code=403, detail="Only completed excursion participants can leave reviews")
    review = Review(**data.model_dump(), user_id=user.id, published=False)
    db.session.add(review)
    await db.commit()
    result = await db.session.execute(select(Review).options(selectinload(Review.excursion)).where(Review.id == review.id))
    review = result.scalar_one()
    _attach_review_view_fields(review)
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


@router.post("/{review_id}/unpublish", response_model=ReviewRead, dependencies=[admin_dep])
async def unpublish_review(db: DBDep, review_id: int) -> Review:
    review = await db.session.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    review.published = False
    await db.commit()
    await db.session.refresh(review)
    return review


@router.delete("/{review_id}", dependencies=[admin_dep])
async def delete_review(db: DBDep, review_id: int) -> dict[str, str]:
    review = await db.session.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.session.delete(review)
    await db.commit()
    return {"detail": "Review deleted"}


async def _user_can_review_excursion(db: DBDep, user_id: int, excursion_id: int) -> bool:
    result = await db.session.execute(
        select(Booking)
        .options(selectinload(Booking.session))
        .join(GuideSession, Booking.session_id == GuideSession.id, isouter=True)
        .where(
            Booking.client_id == user_id,
            Booking.excursion_id == excursion_id,
            Booking.status.in_(["confirmed", "completed"]),
        )
    )
    for booking in result.scalars().all():
        if booking.status == "completed":
            return True
        if booking.session and booking.session.session_date < date.today():
            return True
    return False


def _attach_review_view_fields(review: Review) -> None:
    review.excursion_title = review.excursion.title if review.excursion else None
