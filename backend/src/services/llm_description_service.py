from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone

import ollama

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
        text = _plain_text(text)

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
            "Если фактов мало, скажи аккуратно и обобщенно. Текст должен быть готов для чтения туристам.\n"
            "Не используй Markdown, заголовки, маркированные списки, спецсимволы оформления, **, ## или нумерацию.\n\n"
            f"{payload}"
        )

    async def _ask_ollama(self, prompt: str) -> str | None:
        if settings.llm_provider != "ollama":
            return None
        try:
            client = ollama.Client(host=settings.ollama_base_url)
            data = await asyncio.wait_for(
                asyncio.to_thread(
                    client.chat,
                    model=settings.ollama_model,
                    messages=[{"role": "user", "content": prompt}],
                    stream=False,
                ),
                timeout=settings.llm_timeout_seconds,
            )
        except Exception:
            return None
        return data.get("message", {}).get("content")

    def _fallback_text(self, facts: list[dict]) -> str:
        parts = []
        for item in facts:
            fact_text = (item.get("facts") or "").split("\n")[0]
            parts.append(f"{item.get('title')}. {fact_text}")
        return "\n\n".join(parts)


def _plain_text(text: str | None) -> str:
    value = text or ""
    value = re.sub(r"[*_`#>~-]+", "", value)
    value = re.sub(r"^\s*[-•]\s+", "", value, flags=re.MULTILINE)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()
