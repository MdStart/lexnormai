from fastapi import APIRouter
from .endpoints import settings, content, mapping

api_router = APIRouter()

api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["settings"]
)

api_router.include_router(
    content.router,
    prefix="/content",
    tags=["content"]
)

api_router.include_router(
    mapping.router,
    prefix="/mapping",
    tags=["mapping"]
) 