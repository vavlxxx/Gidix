from fastapi import APIRouter

from src.api.v1.auth import router as auth_router
from src.api.v1.bookings import router as bookings_router
from src.api.v1.excursions import router as excursions_router
from src.api.v1.guide import router as guide_router
from src.api.v1.integrations import router as integrations_router
from src.api.v1.points import router as points_router
from src.api.v1.reviews import router as reviews_router
from src.api.v1.routes import router as routes_router
from src.api.v1.uploads import router as uploads_router
from src.api.v1.users import router as users_router

router = APIRouter(prefix="/v1")
for item in (
    auth_router,
    users_router,
    points_router,
    routes_router,
    excursions_router,
    bookings_router,
    guide_router,
    reviews_router,
    integrations_router,
    uploads_router,
):
    router.include_router(item)

__all__ = ["router"]
