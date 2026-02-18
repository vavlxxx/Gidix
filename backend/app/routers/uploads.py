import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth import require_rules
from app.core.config import settings
from app.permissions import ROUTE_MANAGE

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/")
def upload_file(
    file: UploadFile = File(...),
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> dict:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл не выбран")
    ext = os.path.splitext(file.filename)[1].lower() or ".bin"
    safe_name = f"{uuid4().hex}{ext}"
    os.makedirs(settings.media_dir, exist_ok=True)
    file_path = os.path.join(settings.media_dir, safe_name)
    with open(file_path, "wb") as target:
        content = file.file.read()
        target.write(content)
    return {"file_path": f"/media/{safe_name}"}
