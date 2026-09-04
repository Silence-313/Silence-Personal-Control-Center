"""FastAPI application factory and entrypoint."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session
from starlette.concurrency import run_in_threadpool

from app.api.routes import activities, agents, auth, automation, commands, context, events, health, knowledge, metrics, metrics_history, nodes, power, projects, research, runtime, services, sessions, timeline
from app.core.config import settings
from app.core.errors import ApiError
from app.core.logging import configure_logging
from app.db.database import engine, init_db
from app.health import routes as health_summary_routes
from app.health import service as health_service
from app.metrics_history import service as metrics_history_service
from app.schemas.common import ErrorResponse
from app.services import metrics_service, node_service, sse_service

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
            # Phase 10 Step 1: after the node heartbeat, persist a realtime
            # metrics sample so history accrues regardless of SSE connections.
            metrics = await run_in_threadpool(metrics_service.collect)
            with Session(engine) as session:
                metrics_history_service.record_sample(session, settings.node_id, metrics)
                metrics_history_service.cleanup_old_samples(session)
                # Phase 10 Step 3: persist a light health snapshot (no Docker).
                health_service.record_snapshot(session)
        except Exception:
            logger.exception("heartbeat failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    sse_service.start_notifications()
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

    # In development, also accept any loopback / RFC1918 origin on any port so a
    # device that reaches the frontend over the LAN (whose IP changes under
    # DHCP) can call the API without a hardcoded origin allow-list entry.
    dev_origin_regex = (
        r"^https?://(localhost|127\.0\.0\.1|"
        r"10\.\d+\.\d+\.\d+|"
        r"192\.168\.\d+\.\d+|"
        r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)"
        r"(:\d+)?$"
        if settings.is_development
        else None
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_origin_regex=dev_origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(health.router)
    app.include_router(health_summary_routes.router)
    app.include_router(auth.router)
    app.include_router(nodes.router)
    app.include_router(metrics.router)
    app.include_router(metrics_history.router)
    app.include_router(services.router)
    app.include_router(power.router)
    app.include_router(commands.router)
    app.include_router(projects.router)
    app.include_router(agents.router)
    app.include_router(research.router)
    app.include_router(activities.router)
    app.include_router(sessions.router)
    app.include_router(runtime.router)
    app.include_router(knowledge.router)
    app.include_router(context.router)
    app.include_router(automation.router)
    app.include_router(events.router)
    app.include_router(timeline.router)

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