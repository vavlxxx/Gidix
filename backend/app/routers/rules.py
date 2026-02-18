from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_rules
from app.db import get_db
from app.models import Rule
from app.permissions import RULES_MANAGE, assign_rule_to_role_users, remove_rule_from_role_users
from app.schemas import RuleCreate, RuleOut, RuleUpdate

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("/", response_model=list[RuleOut])
def list_rules(
    db: Session = Depends(get_db),
    user=Depends(require_rules(RULES_MANAGE)),
) -> list[RuleOut]:
    rules = db.query(Rule).order_by(Rule.title.asc()).all()
    return [RuleOut.model_validate(item) for item in rules]


@router.post("/", response_model=RuleOut)
def create_rule(
    payload: RuleCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(RULES_MANAGE)),
) -> RuleOut:
    if db.query(Rule).filter(Rule.code == payload.code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Код правила уже используется")
    if db.query(Rule).filter(Rule.title == payload.title).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название правила уже используется")
    rule = Rule(
        associated_role=payload.associated_role,
        code=payload.code,
        title=payload.title,
        description=payload.description,
        error_message=payload.error_message,
    )
    db.add(rule)
    db.flush()
    assign_rule_to_role_users(db, rule)
    db.commit()
    db.refresh(rule)
    return RuleOut.model_validate(rule)


@router.patch("/{rule_id}", response_model=RuleOut)
def update_rule(
    rule_id: int,
    payload: RuleUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(RULES_MANAGE)),
) -> RuleOut:
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Правило не найдено")
    data = payload.model_dump(exclude_unset=True)
    old_role = rule.associated_role
    if "title" in data and data["title"] != rule.title:
        if db.query(Rule).filter(Rule.title == data["title"], Rule.id != rule.id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Название правила уже используется",
            )
    if "title" in data:
        rule.title = data["title"]
    if "description" in data:
        rule.description = data["description"]
    if "error_message" in data:
        rule.error_message = data["error_message"]
    if "associated_role" in data:
        rule.associated_role = data["associated_role"]
    if "associated_role" in data and old_role != rule.associated_role:
        if old_role:
            remove_rule_from_role_users(db, rule, old_role)
        assign_rule_to_role_users(db, rule)
    db.commit()
    db.refresh(rule)
    return RuleOut.model_validate(rule)


@router.delete("/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(RULES_MANAGE)),
) -> dict:
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Правило не найдено")
    db.delete(rule)
    db.commit()
    return {"status": "ok"}
