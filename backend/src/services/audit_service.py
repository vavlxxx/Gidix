from __future__ import annotations

from src.models.domain import AuditLog
from src.utils.db_tools import DBManager


class AuditService:
    def __init__(self, db: DBManager) -> None:
        self.db = db

    async def log(
        self,
        action: str,
        user_id: int | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        payload: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        self.db.session.add(
            AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                payload=payload,
                ip_address=ip_address,
            )
        )
        await self.db.commit()
