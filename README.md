# GIDIX

GIDIX - веб-приложение для управления экскурсиями: точки интереса, маршруты, расписания, бронирования, отзывы, генерация маршрутов через OSRM и текстов через локальную Ollama.

## Состав

- `backend/` - FastAPI, SQLAlchemy 2, Alembic, PostgreSQL/PostGIS, JWT.
- `frontend/` - React 18 + Vite.
- `backend/osrm/` - подготовленные данные OSRM для Башкортостана.
- `docker-compose.yml` - PostGIS, backend, frontend и опциональный OSRM.

Ollama не запускается контейнером. Backend обращается к уже установленной локальной Ollama по `OLLAMA_BASE_URL`, по умолчанию `http://host.docker.internal:11434` из контейнера.

## Быстрый запуск

```bash
cp .env.example .env
make up
```

С OSRM:

```bash
make up-osrm
```

Адреса:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs

При старте backend выполняет `alembic upgrade head`, затем `python -m src.seed`.

## Тестовые пользователи

- `admin@example.com / admin123`
- `manager@example.com / manager123`
- `dispatcher@example.com / dispatcher123`
- `accountant@example.com / accountant123`
- `guide@example.com / guide123`
- `superuser@example.com / superuser123`

## Миграции

Миграции сделаны последовательной цепочкой:

1. `8093419d4e91` - пользователи, роли, refresh-токены.
2. `2094603e316e` - PostGIS, категории и точки интереса.
3. `a10000000001` - маршруты и точки маршрутов.
4. `a10000000002` - экскурсии, сессии гидов, бронирования, отзывы.
5. `a10000000003` - медиа, аудит, источники генерации описаний.

Команды:

```bash
make migrate
make seed
```

## Интеграции

OSRM:

- включается флагом `ENABLE_ROUTE_GENERATION=true`;
- адрес задается `OSRM_BASE_URL`;
- локальный контейнер запускается через `make up-osrm`.

Ollama:

- включается флагом `ENABLE_LLM_DESCRIPTION=true`;
- модель задается `OLLAMA_MODEL`, по умолчанию `gemma3:latest`;
- перед запуском генерации убедитесь, что локально работает `ollama serve` и модель загружена.

OSM/Wikipedia:

- `ENABLE_WEB_FACT_SEARCH=true` включает поиск фактов;
- `ENABLE_OSM_IMPORT=true` включает импорт точек через Overpass.

## Smoke check

После запуска:

```bash
make smoke
```

Проверяется health, логин админа, профиль, список точек, список экскурсий и создание заявки.
