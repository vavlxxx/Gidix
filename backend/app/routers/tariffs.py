from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_rules
from app.db import get_db
from app.models import Tariff
from app.permissions import TARIFFS_MANAGE
from app.schemas import TariffCreate, TariffOut, TariffUpdate

router = APIRouter(prefix="/api/tariffs", tags=["tariffs"])


@router.get("/", response_model=list[TariffOut])
def list_tariffs(
    db: Session = Depends(get_db),
    user=Depends(require_rules(TARIFFS_MANAGE)),
) -> list[TariffOut]:
    tariffs = db.query(Tariff).order_by(Tariff.title.asc()).all()
    return [TariffOut.model_validate(item) for item in tariffs]


@router.post("/", response_model=TariffOut)
def create_tariff(
    payload: TariffCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(TARIFFS_MANAGE)),
) -> TariffOut:
    if db.query(Tariff).filter(Tariff.title == payload.title).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название тарифа уже используется")
    tariff = Tariff(
        title=payload.title,
        description=payload.description,
        multiplier=payload.multiplier,
    )
    db.add(tariff)
    db.commit()
    db.refresh(tariff)
    return TariffOut.model_validate(tariff)


@router.patch("/{tariff_id}", response_model=TariffOut)
def update_tariff(
    tariff_id: int,
    payload: TariffUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(TARIFFS_MANAGE)),
) -> TariffOut:
    tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тариф не найден")
    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] != tariff.title:
        if db.query(Tariff).filter(Tariff.title == data["title"], Tariff.id != tariff.id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Название тарифа уже используется",
            )
    if "title" in data:
        tariff.title = data["title"]
    if "description" in data:
        tariff.description = data["description"]
    if "multiplier" in data and data["multiplier"] is not None:
        tariff.multiplier = data["multiplier"]
    db.commit()
    db.refresh(tariff)
    return TariffOut.model_validate(tariff)


@router.delete("/{tariff_id}")
def delete_tariff(
    tariff_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(TARIFFS_MANAGE)),
) -> dict:
    tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тариф не найден")
    db.delete(tariff)
    db.commit()
    return {"status": "ok"}
