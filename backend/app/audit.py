import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def log_action(db: Session, user: User | None, action: str, details: dict[str, Any] | None = None) -> None:
    record = AuditLog(
        user_id=user.id if user else None,
        action=action,
        details=json.dumps(details or {}, ensure_ascii=True),
    )
    db.add(record)
