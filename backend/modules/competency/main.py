import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config import get_settings
from database import engine, SessionLocal
from routers import profile, competencies, gap_and_twin

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("statsaksham.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown events.
    Verifies database connectivity and master competency readiness.
    """
    logger.info("StatSaksham AI Backend - Starting up...")
    try:
        with SessionLocal() as db:
            result = db.execute(text("SELECT count(*) FROM competencies;")).scalar()
            logger.info(f"Database connection healthy. Master competencies count: {result}")
    except Exception as e:
        logger.error(f"Failed to connect to database at startup: {e}", exc_info=True)
    yield
    logger.info("StatSaksham AI Backend - Shutting down...")


app = FastAPI(
    title="StatSaksham AI - Module P1: Competency Intelligence & Skill Gap",
    description=(
        "Backend service for Ministry of Statistics & Programme Implementation (MoSPI) - SIH26101.\n\n"
        "Provides multi-step profile ingestion, calibrated baseline AI competency evaluation, "
        "role-based skill gap matrix computation, Recharts Radar charts formatting, "
        "and Competency Digital Twin tracking across all 33 MoSPI competencies."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Enable Full Cross-Origin Resource Sharing (CORS) for frontend clients (React/Vite/Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred while processing the request.",
            "path": request.url.path
        }
    )


# Health Check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "StatSaksham Module P1 - Competency Intelligence & Skill Gap",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER
    }


# Include Routers
app.include_router(profile.router)
app.include_router(competencies.router)
app.include_router(gap_and_twin.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.APP_PORT,
        reload=settings.DEBUG
    )
