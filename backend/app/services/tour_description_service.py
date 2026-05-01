from __future__ import annotations

import requests

from app.core.config import settings
from app.services.route_service import RoutePointInput


class TourDescriptionError(RuntimeError):
    pass


class TourDescriptionService:
    def __init__(self) -> None:
        self.provider = settings.llm_provider
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model
        self.timeout = settings.llm_timeout_seconds

    def build_prompt(
        self,
        title: str,
        points: list[RoutePointInput],
        duration_min: float | None,
        distance_km: float | None,
        constraints: str | None,
    ) -> str:
        point_blocks = []
        for index, point in enumerate(points, 1):
            facts = point.facts or "Достоверные факты не переданы. Не выдумывай детали."
            point_blocks.append(
                "\n".join(
                    [
                        f"Точка {index}: {point.name}",
                        f"Координаты: {point.lat}, {point.lon}",
                        f"Факты: {facts}",
                    ]
                )
            )

        route_stats = []
        if duration_min is not None:
            route_stats.append(f"Длительность: {duration_min:.0f} минут")
        if distance_km is not None:
            route_stats.append(f"Расстояние: {distance_km:.2f} км")
        if constraints:
            route_stats.append(f"Дополнительные ограничения: {constraints}")

        return f"""
Ты пишешь черновик описания экскурсии для системы GIDIX.

Название экскурсии: {title}
Параметры маршрута:
{chr(10).join(route_stats) if route_stats else "Параметры не указаны."}

Правила:
1. Не меняй порядок точек.
2. Не выдумывай даты, имена архитекторов, легенды и исторические факты.
3. Используй только переданные сведения.
4. Если сведений мало, пиши аккуратно и обобщенно.
5. Делай связные переходы между точками.
6. Верни только текст описания без списка источников и служебных комментариев.

Данные по точкам:

{chr(10).join(point_blocks)}
""".strip()

    def generate(
        self,
        title: str,
        points: list[RoutePointInput],
        duration_min: float | None = None,
        distance_km: float | None = None,
        constraints: str | None = None,
    ) -> str:
        if not settings.enable_llm_description:
            raise TourDescriptionError("Генерация описаний отключена переменной ENABLE_LLM_DESCRIPTION.")
        if self.provider != "ollama":
            raise TourDescriptionError(f"Провайдер LLM не поддержан: {self.provider}.")

        prompt = self.build_prompt(title, points, duration_min, distance_km, constraints)
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }
        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise TourDescriptionError(f"Ollama недоступна: {exc}") from exc

        content = data.get("message", {}).get("content")
        if not content:
            raise TourDescriptionError("Ollama вернула пустое описание.")
        return str(content).strip()
