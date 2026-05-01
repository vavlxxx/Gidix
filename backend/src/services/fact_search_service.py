from __future__ import annotations

import asyncio
from urllib.parse import quote

import httpx

from src.config import settings


class FactSearchService:
    def __init__(self) -> None:
        self.headers = {"User-Agent": settings.osm_user_agent}

    async def get_landmark_info(self, name: str, city: str = "Уфа") -> dict:
        if not settings.enable_web_fact_search:
            return {"source": "disabled", "title": name, "facts": "", "url": None}
        wiki = await self.get_wikipedia_info(name, city)
        if wiki:
            return wiki
        await asyncio.sleep(1.1)
        osm = await self.get_osm_info(name, city)
        if osm:
            return osm
        return {
            "source": "not_found",
            "title": name,
            "facts": "Публичные факты не найдены. Используйте только сведения из названия и не выдумывайте детали.",
            "url": None,
        }

    async def get_wikipedia_info(self, name: str, city: str) -> dict | None:
        direct = await self._get_wiki_summary_by_title(name)
        if direct:
            return direct
        found_title = await self._search_wikipedia_title(f"{name} {city}")
        if not found_title:
            return None
        return await self._get_wiki_summary_by_title(found_title)

    async def get_osm_info(self, name: str, city: str) -> dict | None:
        url = f"{settings.nominatim_base_url}/search"
        params = {"q": f"{name}, {city}", "format": "json", "addressdetails": 1, "limit": 1, "extratags": 1, "namedetails": 1}
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=15) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
        except Exception:
            return None
        if not data:
            return None
        item = data[0]
        facts = [
            f"Название: {item.get('display_name')}",
            f"Тип объекта: {item.get('type')}",
            f"Класс объекта: {item.get('class')}",
            f"Координаты: {item.get('lat')}, {item.get('lon')}",
        ]
        if item.get("address"):
            facts.append(f"Адресные данные: {item['address']}")
        if item.get("extratags"):
            facts.append(f"Дополнительные теги OSM: {item['extratags']}")
        return {
            "source": "openstreetmap_nominatim",
            "title": name,
            "facts": "\n".join(facts),
            "url": f"https://www.openstreetmap.org/{item.get('osm_type')}/{item.get('osm_id')}",
            "lat": item.get("lat"),
            "lon": item.get("lon"),
        }

    async def _get_wiki_summary_by_title(self, title: str) -> dict | None:
        encoded_title = quote(title.replace(" ", "_"), safe="")
        url = f"https://{settings.wikipedia_language}.wikipedia.org/api/rest_v1/page/summary/{encoded_title}"
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=15) as client:
                response = await client.get(url)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                data = response.json()
        except Exception:
            return None
        if data.get("type") == "disambiguation" or not data.get("extract"):
            return None
        return {
            "source": "wikipedia_summary",
            "title": data.get("title", title),
            "facts": data.get("extract"),
            "url": data.get("content_urls", {}).get("desktop", {}).get("page"),
        }

    async def _search_wikipedia_title(self, query: str) -> str | None:
        url = f"https://{settings.wikipedia_language}.wikipedia.org/w/api.php"
        params = {"action": "query", "list": "search", "srsearch": query, "format": "json", "utf8": 1, "srlimit": 1}
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=15) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
        except Exception:
            return None
        results = data.get("query", {}).get("search", [])
        return results[0]["title"] if results else None
