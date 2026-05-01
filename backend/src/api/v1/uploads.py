from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.config import settings
from src.models.domain import MediaAsset

router = APIRouter(prefix="/uploads", tags=["uploads"], dependencies=[Depends(require_any_role("manager", "admin", "superuser"))])


@router.post("")
async def upload_file(db: DBDep, file: UploadFile = File(...)) -> dict:
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    target = Path(settings.media_dir) / file.filename
    content = await file.read()
    target.write_bytes(content)
    asset = MediaAsset(url=f"/media/{file.filename}", file_name=file.filename, mime_type=file.content_type, size_bytes=len(content), entity_type="upload")
    db.session.add(asset)
    await db.commit()
    await db.session.refresh(asset)
    return {"id": asset.id, "url": asset.url}
