from __future__ import annotations

import requests

from app.core.config import settings


class OverpassImportError(RuntimeError):
    pass


TAG_CATEGORY_MAP = {
    "museum": "музей",
    "gallery": "музей",
    "viewpoint": "обзорная площадка",
    "artwork": "арт-объект",
    "attraction": "памятник",
    "place_of_worship": "храм",
    "theatre": "театр",
    "arts_centre": "театр",
    "park": "парк",
    "garden": "парк",
    "fountain": "арт-объект",
    "church": "храм",
    "cathedral": "храм",
    "mosque": "храм",
    "synagogue": "храм",
    "temple": "храм",
}


def normalize_name(tags: dict) -> str | None:
    for key in ("name:ru", "name"):
        value = tags.get(key)
        if value:
            return " ".join(str(value).split())
    return None


def category_from_tags(tags: dict) -> str:
    for key in ("tourism", "amenity", "leisure", "building"):
        value = tags.get(key)
        if value in TAG_CATEGORY_MAP:
            return TAG_CATEGORY_MAP[value]
    if tags.get("historic") or tags.get("memorial"):
        return "памятник"
    return "арт-объект"


class OSMImportService:
    def fetch_candidates(
        self,
        south: float,
        west: float,
        north: float,
        east: float,
        limit: int,
    ) -> list[dict]:
        if not settings.enable_osm_import:
            raise OverpassImportError("Импорт OSM отключен переменной ENABLE_OSM_IMPORT.")

        query = f"""
        [out:json][timeout:{settings.overpass_timeout_seconds}];
        (
          node["tourism"~"^(attraction|museum|gallery|viewpoint|artwork)$"]({south},{west},{north},{east});
          way["tourism"~"^(attraction|museum|gallery|viewpoint|artwork)$"]({south},{west},{north},{east});
          relation["tourism"~"^(attraction|museum|gallery|viewpoint|artwork)$"]({south},{west},{north},{east});
          node["historic"]({south},{west},{north},{east});
          way["historic"]({south},{west},{north},{east});
          relation["historic"]({south},{west},{north},{east});
          node["memorial"]({south},{west},{north},{east});
          way["memorial"]({south},{west},{north},{east});
          node["amenity"~"^(place_of_worship|theatre|arts_centre|fountain)$"]({south},{west},{north},{east});
          way["amenity"~"^(place_of_worship|theatre|arts_centre|fountain)$"]({south},{west},{north},{east});
          node["leisure"~"^(park|garden)$"]({south},{west},{north},{east});
          way["leisure"~"^(park|garden)$"]({south},{west},{north},{east});
          node["building"~"^(church|cathedral|mosque|synagogue|temple)$"]({south},{west},{north},{east});
          way["building"~"^(church|cathedral|mosque|synagogue|temple)$"]({south},{west},{north},{east});
        );
        out center tags {limit};
        """
        headers = {"User-Agent": settings.osm_user_agent}
        try:
            response = requests.post(
                settings.overpass_url,
                data={"data": query},
                headers=headers,
                timeout=settings.overpass_timeout_seconds,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise OverpassImportError(f"Overpass недоступен: {exc}") from exc

        candidates: list[dict] = []
        seen: set[tuple[str, float, float]] = set()
        for element in data.get("elements", []):
            tags = element.get("tags") or {}
            name = normalize_name(tags)
            lat = element.get("lat") or (element.get("center") or {}).get("lat")
            lon = element.get("lon") or (element.get("center") or {}).get("lon")
            if not name or lat is None or lon is None:
                continue
            lat_value = round(float(lat), 7)
            lon_value = round(float(lon), 7)
            dedupe_key = (name.casefold(), lat_value, lon_value)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            source_tag = category_from_tags(tags)
            osm_type = element.get("type")
            osm_id = element.get("id")
            candidates.append(
                {
                    "name": name,
                    "short_description": tags.get("description") or tags.get("tourism") or tags.get("historic"),
                    "full_description": tags.get("description"),
                    "lat": lat_value,
                    "lon": lon_value,
                    "active": False,
                    "source": f"osm:{source_tag}",
                    "source_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
                    "category_name": source_tag,
                }
            )
            if len(candidates) >= limit:
                break
        return candidates
