import requests
from fastapi import APIRouter, Depends

from app.auth import require_rules
from app.core.config import settings
from app.permissions import INTEGRATIONS_MANAGE

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def _check_url(url: str, timeout: int) -> dict:
    try:
        response = requests.get(url, timeout=timeout)
        return {"available": response.ok, "status_code": response.status_code}
    except requests.RequestException as exc:
        return {"available": False, "error": str(exc)}


@router.get("/status")
def integration_status(user=Depends(require_rules(INTEGRATIONS_MANAGE))) -> dict:
    osrm_url = (
        f"{settings.osrm_base_url.rstrip('/')}/nearest/v1/"
        f"{settings.osrm_profile}/55.9258453,54.7184771?number=1"
    )
    ollama_url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
    return {
        "app_name": settings.app_name,
        "route_generation_enabled": settings.enable_route_generation,
        "llm_description_enabled": settings.enable_llm_description,
        "osm_import_enabled": settings.enable_osm_import,
        "payments_mock_enabled": settings.enable_payments_mock,
        "osrm": {
            "base_url": settings.osrm_base_url,
            "profile": settings.osrm_profile,
            **_check_url(osrm_url, min(settings.osrm_timeout_seconds, 5)),
        },
        "ollama": {
            "base_url": settings.ollama_base_url,
            "model": settings.ollama_model,
            **_check_url(ollama_url, min(settings.llm_timeout_seconds, 5)),
        },
        "overpass": {
            "url": settings.overpass_url,
            "timeout_seconds": settings.overpass_timeout_seconds,
        },
    }
