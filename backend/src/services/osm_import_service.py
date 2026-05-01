from __future__ import annotations

import httpx

from src.config import settings
from src.models.domain import PointOfInterest
from src.schemas.domain import ImportOSMRequest
from src.utils.db_tools import DBManager


class OSMImportService:
    def __init__(self, db: DBManager) -> None:
        self.db = db

    async def import_points(self, data: ImportOSMRequest) -> list[PointOfInterest]:
        if not settings.enable_osm_import:
            return []
        query = self._build_query(data)
        try:
            async with httpx.AsyncClient(timeout=settings.overpass_timeout_seconds) as client:
                response = await client.post(settings.overpass_url, data={"data": query})
                response.raise_for_status()
                payload = response.json()
        except Exception:
            return []
        created: list[PointOfInterest] = []
        for element in payload.get("elements", [])[: data.limit]:
            tags = element.get("tags") or {}
            name = tags.get("name") or tags.get("name:ru")
            lat = element.get("lat") or element.get("center", {}).get("lat")
            lon = element.get("lon") or element.get("center", {}).get("lon")
            if not name or lat is None or lon is None:
                continue
            point = PointOfInterest(
                name=name,
                short_description=tags.get("description") or tags.get("tourism"),
                address=tags.get("addr:street"),
                latitude=lat,
                longitude=lon,
                source="overpass",
                external_id=f"{element.get('type')}/{element.get('id')}",
                extra=tags,
            )
            self.db.session.add(point)
            created.append(point)
        await self.db.commit()
        return created

    def _build_query(self, data: ImportOSMRequest) -> str:
        bbox = data.bbox or "54.65,55.85,54.85,56.05"
        south, west, north, east = bbox.split(",")
        return f"""
        [out:json][timeout:{settings.overpass_timeout_seconds}];
        (
          node["tourism"]({south},{west},{north},{east});
          way["tourism"]({south},{west},{north},{east});
          relation["tourism"]({south},{west},{north},{east});
        );
        out center {data.limit};
        """
