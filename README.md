# GIDIX

GIDIX - демонстрационная АИС для управления экскурсионными маршрутами научного туризма: публичный каталог, точки интереса, маршруты, сеансы, заявки, отзывы, роли сотрудников, расчет маршрута через OSRM и генерация черновика описания через локальную LLM.

## Сервисы

- `frontend` - React + Vite, публичная часть и админ-панель.
- `backend` - FastAPI, REST API, RBAC, интеграции OSRM/Overpass/Ollama.
- `postgres` - PostgreSQL + PostGIS.
- `osrm` - опциональный локальный OSRM с подготовленными файлами `./osrm/bashkortostan_republic.osrm`.
- `ollama` - опциональная локальная LLM.

## Запуск

```bash
cp .env.example .env
docker compose up --build
```

Адреса по умолчанию:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/api/docs

OSRM и Ollama вынесены в профили:

```bash
docker compose --profile osrm up --build
docker compose --profile osrm --profile llm up --build
```

Если OSRM запускается отдельно из `osrm/docker-compose.yaml`, задайте `OSRM_BASE_URL=http://host.docker.internal:5000` или другой доступный URL в `.env`.

## Переменные окружения

Все важные адреса и секреты задаются через `.env`. Шаблон находится в [.env.example](.env.example): БД, JWT, публичные URL, OSRM, Overpass, Ollama, feature flags и лимиты алгоритмов оптимизации.

Для локальной LLM по умолчанию используется:

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=gemma3:latest
```

Для OSRM важно передавать координаты в порядке `lon,lat`. Backend делает это в `RouteService`; в UI и БД координаты хранятся как `lat`/`lon` или `lat`/`lng`.

## Данные и роли

При первом старте создаются роли `client`, `dispatcher`, `manager`, `accountant`, `guide`, `admin`, `superuser`, справочник категорий POI, точки Уфы, маршруты, экскурсии, сеансы и тестовые заявки.

Тестовые учетные записи:

- `admin@example.com` / `admin123`
- `manager@example.com` / `manager123`
- `dispatcher@example.com` / `dispatcher123`
- `accountant@example.com` / `accountant123`
- `guide1@example.com` / `guide123`
- `superuser@example.com` / `superuser123`

## Проверки

После запуска контейнеров:

```bash
python scripts/smoke_check.py
```

Скрипт проверяет health API, логин администратора, RBAC, планирование маршрута, статус интеграций и создание заявки при наличии доступной даты.

Backend-синтаксис можно проверить так:

```bash
uv run --python 3.11 python -m compileall backend/app
```

Frontend собирается командой:

```bash
cd frontend
npm ci
npm run build
```

## Основные сценарии

1. Клиент открывает каталог, смотрит карточку экскурсии с картой маршрута и оставляет заявку.
2. Диспетчер или менеджер обрабатывает заявку.
3. Менеджер ведет точки интереса, маршруты и экскурсии, рассчитывает маршрут через OSRM и генерирует черновик описания.
4. Бухгалтер формирует mock-счет и отмечает статус оплаты.
5. Экскурсовод получает назначенные сеансы и маршрутное задание.
6. Администратор управляет пользователями, правами и интеграциями.
