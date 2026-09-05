"""
StatSaksham AI — Unified Master Backend
Integrates Module P1, P2, P3, and P4 under a single consolidated FastAPI process on port 8000.
"""
import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Add backend and module directories to sys.path
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

_LEARNING_DIR = _BACKEND_DIR / "modules" / "learning"
if _LEARNING_DIR.exists() and str(_LEARNING_DIR) not in sys.path:
    sys.path.insert(0, str(_LEARNING_DIR))

# Add P4 workforce directory to sys.path so 'from app...' resolves
_P4_DIR = _BACKEND_DIR / "modules" / "workforce"
if _P4_DIR.exists() and str(_P4_DIR) not in sys.path:
    sys.path.insert(0, str(_P4_DIR))

from config import settings
from routes import health, ai, documents, search, assessment, learners, learning_assistant
from routes.igot import router as igot_router

# Import P1 Bridge (isolated namespace loader)
from integrations.p1_bridge import (
    p1_profile_router,
    p1_competencies_router,
    p1_gap_and_twin_router,
    p1_session_local
)

# Import P4 components
try:
    from app.api.v1.router import api_router as p4_api_router
    from app.core.database import Base as p4_base, engine as p4_engine, SessionLocal as p4_session_local
    from app.seed.seeder import seed_database as p4_seed_database
    from app.core.config import settings as p4_settings
    _P4_AVAILABLE = True
except Exception as e:
    logging.getLogger("statsaksham.main").warning(f"Could not load P4 modules: {e}")
    p4_api_router = None
    _P4_AVAILABLE = False

logger = logging.getLogger("statsaksham.main")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Unified lifespan managing database readiness and data initialization."""
    logger.info("StatSaksham AI Unified Master Backend — Starting up...")

    # 1. P4 SQLite database initialization & automatic seed
    if _P4_AVAILABLE and p4_engine and p4_session_local:
        try:
            p4_base.metadata.create_all(bind=p4_engine)
            if getattr(p4_settings, "AUTO_SEED_DATA", True):
                with p4_session_local() as db:
                    p4_seed_database(db)
                logger.info("P4 workforce database (SQLite) verified and seeded successfully.")
        except Exception as e:
            logger.warning(f"P4 database initialization notice: {e}")

    # 2. P1 Supabase/PostgreSQL database connectivity check
    if p1_session_local:
        try:
            with p1_session_local() as db:
                count = db.execute(text("SELECT count(*) FROM competencies;")).scalar()
                logger.info(f"P1 database (Supabase/PostgreSQL) connected. Master competencies: {count}")
        except Exception as e:
            logger.warning(f"P1 database notice (transient pooler or offline mode): {e}")

    # 3. P3 directories verified by config.py
    logger.info("P3 local file persistence & FAISS index storage ready.")

    yield
    logger.info("StatSaksham AI Unified Master Backend — Shutting down...")


app = FastAPI(
    title="StatSaksham AI — National Statistical Capacity Building Platform",
    version="1.0.0",
    description=(
        "Unified Master Backend for MoSPI — Ministry of Statistics & Programme Implementation.\n\n"
        "Integrates:\n"
        "- Module P1: Competency Intelligence & Digital Twin (/api/v1/competencies, /api/v1/profile, /api/v1/competency)\n"
        "- Module P2: iGOT Karmayogi Personalized Course Recommendations (/api/igot/...)\n"
        "- Module P3: AI Learning Materials, FAISS RAG Assistant & Grounded Assessments (/api/...)\n"
        "- Module P4: Admin Workforce Analytics, Heatmaps, What-If Simulator & Quest Gamification (/api/v1/...)\n"
    ),
    lifespan=lifespan
)

# Centralized CORS Configuration for Frontend Clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Mount P3 + P2 Routers (Namespace: /api) ---
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(search.router, prefix=settings.API_PREFIX)
app.include_router(assessment.router, prefix=settings.API_PREFIX)
app.include_router(learners.router, prefix=settings.API_PREFIX)
app.include_router(learning_assistant.router, prefix=settings.API_PREFIX)
app.include_router(igot_router)

# --- 2. Mount P1 Routers (Namespace: /api/v1 and /api aliases) ---
if p1_profile_router:
    app.include_router(p1_profile_router)
if p1_competencies_router:
    app.include_router(p1_competencies_router)
    # Provide alias /api/competencies matching /api/v1/competencies for client compatibility
    for route in p1_competencies_router.routes:
        if route.path == "/api/v1/competencies" and "GET" in getattr(route, "methods", set()):
            app.add_api_route(
                "/api/competencies",
                route.endpoint,
                methods=["GET"],
                tags=["Competencies (Alias)"],
                response_model=getattr(route, "response_model", None)
            )
if p1_gap_and_twin_router:
    app.include_router(p1_gap_and_twin_router)

# --- 3. Mount P4 Routers (Namespace: /api/v1) ---
if p4_api_router:
    app.include_router(p4_api_router, prefix="/api/v1")

# --- 4. Cross-Module Workflow Integration Endpoints ---
from integrations.workflow_service import workflow_service
from integrations.identity_mapping import identity_service
from integrations.competency_mapping import competency_service

integration_router = APIRouter(prefix="/api/v1/integration", tags=["Cross-Module Integration"])

@integration_router.get("/learner-flow/{user_identifier}")
def get_connected_learner_flow(user_identifier: str):
    """
    Returns the unified learner status across P1, P2, P3, and P4:
    - Canonical Identity
    - P1 Competency Gaps
    - P2 iGOT Recommendations
    """
    identity = identity_service.resolve(user_identifier)
    gaps = workflow_service.get_learner_gaps(user_identifier)
    recommendations = workflow_service.get_recommendations_for_learner(user_identifier)
    return {
        "status": "connected",
        "identity": identity,
        "total_competency_gaps": len(gaps),
        "competency_gaps": gaps,
        "recommendations": recommendations
    }

@integration_router.get("/recommendations/{user_identifier}")
def get_integrated_recommendations(user_identifier: str, limit: int = 5):
    """P1 Competency Gaps -> P2 iGOT Recommendations"""
    return workflow_service.get_recommendations_for_learner(user_identifier, limit=limit)

@integration_router.get("/learning-context/{user_identifier}/{competency_id}")
def get_integrated_learning_context(user_identifier: str, competency_id: int):
    """P2 Recommendation -> P3 Document/Topic Learning Context"""
    return workflow_service.get_learning_context_for_competency(user_identifier, competency_id)

app.include_router(integration_router)



@app.get("/", tags=["Root"])
def root():
    return {
        "platform": "StatSaksham AI — Official Statistical Capacity Building System",
        "status": "operational",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": f"{settings.API_PREFIX}/health",
        "modules": {
            "p1_competency": "ACTIVE (/api/v1/competencies, /api/v1/profile, /api/v1/competency)",
            "p2_igot": "ACTIVE (/api/igot/courses, /api/igot/recommendations)",
            "p3_learning_rag": "ACTIVE (/api/documents, /api/search, /api/assessment, /api/learning-assistant)",
            "p4_admin_quest": "ACTIVE (/api/v1/admin, /api/v1/quest, /api/v1/analytics)"
        }
    }


@app.get("/health", tags=["Root"])
def root_health():
    """Top-level health check matching standard root /health."""
    return {
        "status": "healthy",
        "platform": "StatSaksham AI Unified Backend",
        "p1_status": "ready" if p1_competencies_router else "offline",
        "p2_status": "ready (mock adapter)",
        "p3_status": "ready (FAISS + sentence-transformers)",
        "p4_status": "ready (SQLite)" if _P4_AVAILABLE else "offline"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
