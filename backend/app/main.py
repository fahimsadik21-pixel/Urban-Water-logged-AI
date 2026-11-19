"""Main FastAPI application for Urban Water-logged AI."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.app.config import settings
from backend.app.api.v1.routes_incidents import router as incidents_router
from backend.app.api.v1.routes_reports import router as reports_router
from backend.app.api.v1.routes_map import router as map_router
from backend.app.api.v1.routes_pumps import router as pumps_router
from backend.app.api.v1.routes_audit import router as audit_router
from backend.app.api.v1.routes_simulation import router as simulation_router
from backend.app.api.v1.routes_public import router as public_router
from backend.app.api.v1.routes_devices import router as devices_router
from backend.app.api.v1.routes_camera import router as camera_router
from backend.app.api.v1.routes_local_controller import router as local_controller_router
from backend.app.api.v1.routes_auth import router as auth_router
from backend.app.api.v1.routes_operator import router as operator_router
from backend.app.api.v1.routes_admin import router as admin_router
from backend.app.services.seed_service import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize schema and baseline data once per application lifecycle."""
    seed_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Urban Water-logged AI: A city-adaptive, uncertainty-aware urban waterlogging detection, "
        "verification, response-prioritization, public-warning and smart-dewatering SaaS platform."
    ),
    lifespan=lifespan,
)

# CORS setup for web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler that guarantees CORS headers and useful error messages."""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

# Include v1 routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(map_router, prefix=settings.API_V1_STR)
app.include_router(pumps_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(public_router, prefix=settings.API_V1_STR)
app.include_router(devices_router, prefix=settings.API_V1_STR)
app.include_router(camera_router, prefix=settings.API_V1_STR)
app.include_router(local_controller_router, prefix=settings.API_V1_STR)
app.include_router(operator_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

# Mount frontend production build if present
frontend_dist = settings.BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/app", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


@app.get("/")
def root_status(request: Request):
    """Root system status or marketing landing page if HTML requested in browser."""
    accept = request.headers.get("accept", "")
    landing_file = settings.BASE_DIR / "index.html"
    if "text/html" in accept and landing_file.exists():
        return FileResponse(landing_file)
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "city_pilot": settings.CITY_NAME,
        "benchmark_mode": settings.SIMULATION_BENCHMARK_LABEL,
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "app_url": "/app/",
        "landing_url": "/landing",
    }


@app.get("/landing")
def landing_page():
    """Direct route to the Quantum²-inspired marketing landing page."""
    landing_file = settings.BASE_DIR / "index.html"
    if landing_file.exists():
        return FileResponse(landing_file)
    return {"message": "Landing page not found"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "HEALTHY"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
