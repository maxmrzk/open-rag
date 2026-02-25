"""FastAPI application factory."""

from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import components, docker, projects, runs, settings, systems
from app.core.config import get_settings

settings_obj = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="RAG System Builder API",
        description="Backend API for the RAG System Builder frontend.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ------------------------------------------------------------------ CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings_obj.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------- Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"data": None, "success": False, "message": str(exc)},
        )

    # ---------------------------------------------------------- Health probe
    @app.get("/api/v1/health", tags=["health"])
    async def health():
        return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}

    # ---------------------------------------------------------- Routers
    prefix = settings_obj.API_V1_PREFIX

    app.include_router(projects.router, prefix=prefix)
    app.include_router(systems.router, prefix=prefix)
    app.include_router(runs.router, prefix=prefix)
    app.include_router(docker.router, prefix=prefix)
    app.include_router(settings.router, prefix=prefix)
    app.include_router(components.router, prefix=prefix)

    return app


app = create_app()
