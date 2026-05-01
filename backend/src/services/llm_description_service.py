from __future__ import annotations

from datetime import datetime, timezone

import httpx

from src.config import settings
from src.models.domain import GeneratedDescriptionSource, PointOfInterest, Route
from src.services.fact_search_service import FactSearchService
from src.utils.db_tools import DBManager


class LLMDescriptionService:
    def __init__(self, db: DBManager) -> None:
        self.db = db

    async def generate_for_route(self, route: Route) -> tuple[str, list[dict]]:
        facts = []
        for link in sorted(route.points, key=lambda item: item.position):
            point = link.point
            facts.append(await self._collect_point_fact(point))

        prompt = self._build_prompt(facts)
        if not settings.enable_llm_description:
            text = self._fallback_text(facts)
        else:
            text = await self._ask_ollama(prompt) or self._fallback_text(facts)

        source = GeneratedDescriptionSource(
            entity_type="route",
            entity_id=route.id,
            source=settings.llm_provider,
            title=route.title,
            facts="\n\n".join(item["facts"] for item in facts),
            prompt=prompt,
            generated_text=text,
            generated_at=datetime.now(timezone.utc),
        )
        self.db.session.add(source)
        route.description = text
        await self.db.commit()
        return text, facts

    async def _collect_point_fact(self, point: PointOfInterest) -> dict:
        info = await FactSearchService().get_landmark_info(point.name)
        if point.full_description:
            info["facts"] = f"{point.full_description}\n\n{info.get('facts') or ''}".strip()
        elif point.short_description:
            info["facts"] = f"{point.short_description}\n\n{info.get('facts') or ''}".strip()
        return info

    def _build_prompt(self, facts: list[dict]) -> str:
        payload = "\n\n".join(
            f"Точка {index}: {item.get('title')}\nИсточник: {item.get('source')}\nURL: {item.get('url')}\nФакты:\n{item.get('facts')}"
            for index, item in enumerate(facts, 1)
        )
        return (
            "Ты экскурсовод GIDIX. Напиши связный текст экскурсии на русском языке.\n"
            "Не выдумывай даты, имена и легенды. Используй только предоставленные факты.\n"
            "Если фактов мало, скажи аккуратно и обобщенно. Текст должен быть готов для чтения туристам.\n\n"
            f"{payload}"
        )

    async def _ask_ollama(self, prompt: str) -> str | None:
        if settings.llm_provider != "ollama":
            return None
        url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
        payload = {
            "model": settings.ollama_model,
            "stream": False,
            "messages": [{"role": "user", "content": prompt}],
        }
        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
        except Exception:
            return None
        return data.get("message", {}).get("content")

    def _fallback_text(self, facts: list[dict]) -> str:
        parts = []
        for item in facts:
            fact_text = (item.get("facts") or "").split("\n")[0]
            parts.append(f"{item.get('title')}. {fact_text}")
        return "\n\n".join(parts)
