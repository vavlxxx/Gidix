from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User, UserRole


def seed_if_needed(db: Session) -> None:
    if db.query(User).first():
        return

    admin = User(
        full_name="Администратор",
        email=settings.default_admin_email,
        hashed_password=get_password_hash(settings.default_admin_password),
        role=UserRole.admin,
        is_active=True,
    )
    manager = User(
        full_name="Менеджер",
        email="manager@example.com",
        hashed_password=get_password_hash("manager123"),
        role=UserRole.manager,
        is_active=True,
    )
    db.add_all([admin, manager])
    db.commit()
