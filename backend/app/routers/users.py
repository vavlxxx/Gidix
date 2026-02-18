from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_rules
from app.core.security import get_password_hash
from app.db import get_db
from app.models import Rule, User, UserRole, UserRule
from app.permissions import ROUTE_MANAGE, RULES_MANAGE, USERS_MANAGE, sync_user_rules
from app.schemas import GuideOut, UserCreate, UserOut, UserRulesUpdate, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/guides", response_model=list[GuideOut])
def list_guides(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> list[GuideOut]:
    query = db.query(User).filter(User.role == UserRole.guide)
    if not include_inactive:
        query = query.filter(User.is_active.is_(True))
    guides = query.order_by(User.full_name.asc()).all()
    return [GuideOut.model_validate(item) for item in guides]


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    user=Depends(require_rules(USERS_MANAGE)),
) -> list[UserOut]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserOut.model_validate(item) for item in users]


@router.post("/", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(USERS_MANAGE)),
) -> UserOut:
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email уже используется")
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(new_user)
    db.flush()
    sync_user_rules(db, new_user)
    log_action(db, user, "user_create", {"email": payload.email, "role": payload.role.value})
    db.commit()
    db.refresh(new_user)
    return UserOut.model_validate(new_user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(USERS_MANAGE)),
) -> UserOut:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    role_changed = False
    if payload.full_name is not None:
        target.full_name = payload.full_name
    if payload.role is not None:
        target.role = payload.role
        role_changed = True
    if payload.is_active is not None:
        target.is_active = payload.is_active
    if payload.password:
        target.hashed_password = get_password_hash(payload.password)
    if role_changed:
        sync_user_rules(db, target)
    log_action(db, user, "user_update", {"user_id": target.id})
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)


@router.put("/{user_id}/rules", response_model=UserOut)
def update_user_rules(
    user_id: int,
    payload: UserRulesUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(RULES_MANAGE)),
) -> UserOut:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    rule_ids = {int(item) for item in payload.rule_ids}
    if rule_ids:
        valid_rules = (
            db.query(Rule.id)
            .filter(Rule.id.in_(rule_ids), Rule.associated_role.is_(None))
            .all()
        )
        allowed_ids = {rule_id for (rule_id,) in valid_rules}
    else:
        allowed_ids = set()
    db.query(UserRule).join(Rule, Rule.id == UserRule.rule_id).filter(
        UserRule.user_id == target.id,
        Rule.associated_role.is_(None),
    ).delete(synchronize_session=False)
    for rule_id in allowed_ids:
        db.add(UserRule(user_id=target.id, rule_id=rule_id))
    sync_user_rules(db, target)
    log_action(db, user, "user_rules_update", {"user_id": target.id})
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)
