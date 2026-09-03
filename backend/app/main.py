"""FastAPI application factory and entrypoint."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.api.routes import activities, agents, auth, commands, events, health, metrics, nodes, power, projects, research, runtime, services, sessions
from app.core.config import settings
from app.core.errors import ApiError
from app.core.logging import configure_logging
from app.db.database import engine, init_db
from app.schemas.common import ErrorResponse
from app.services import node_service

logger = logging.getLogger("silence.backend")

_STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    410: "GONE",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


async def _heartbeat_loop() -> None:
    while True:
        await asyncio.sleep(settings.heartbeat_interval_seconds)
        try:
            with Session(engine) as session:
                node_service.heartbeat(session)
        except Exception:
            logger.exception("heartbeat failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with Session(engine) as session:
        node_service.register_local_node(session)
    task = asyncio.create_task(_heartbeat_loop())
    logger.info("heartbeat started", extra={"interval_seconds": settings.heartbeat_interval_seconds})
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title="Silence Control Center",
        version="0.1.0",
        description="Personal Control Center — Control Plane API",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(nodes.router)
    app.include_router(metrics.router)
    app.include_router(services.router)
    app.include_router(power.router)
    app.include_router(commands.router)
    app.include_router(projects.router)
    app.include_router(agents.router)
    app.include_router(research.router)
    app.include_router(activities.router)
    app.include_router(sessions.router)
    app.include_router(runtime.router)
    app.include_router(events.router)

    # --- uniform error handling (§45) -------------------------------------
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error={"code": "VALIDATION_ERROR", "message": "Request validation failed"}
            ).model_dump(),
        )

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error={"code": exc.code, "message": exc.message}
            ).model_dump(),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        code = _STATUS_CODES.get(exc.status_code, f"HTTP_{exc.status_code}")
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error={"code": code, "message": str(exc.detail)}
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled exception",
            extra={"path": str(request.url.path), "method": request.method},
        )
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error={"code": "INTERNAL_ERROR", "message": "Internal server error"}
            ).model_dump(),
        )

    logger.info("application created", extra={"env": settings.env, "host": settings.host})
    return app


app = create_app()