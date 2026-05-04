from __future__ import annotations

import re
from uuid import uuid4
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.config import settings
from src.models.domain import MediaAsset

router = APIRouter(prefix="/uploads", tags=["uploads"], dependencies=[Depends(require_any_role("it_specialist", "manager", "admin", "superuser"))])


@router.post("")
async def upload_file(db: DBDep, file: UploadFile = File(...)) -> dict:
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    source_name = Path(file.filename or "upload").name
    suffix = Path(source_name).suffix.lower()
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(source_name).stem).strip("-") or "media"
    file_name = f"{stem}-{uuid4().hex[:10]}{suffix}"
    target = Path(settings.media_dir) / file_name
    content = await file.read()
    target.write_bytes(content)
    asset = MediaAsset(url=f"/media/{file_name}", file_name=file_name, mime_type=file.content_type, size_bytes=len(content), entity_type="upload")
    db.session.add(asset)
    await db.commit()
    await db.session.refresh(asset)
    return {"id": asset.id, "url": asset.url}
