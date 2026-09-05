from fastapi import APIRouter
from app.api.v1.learner_analytics import router as learner_router
from app.api.v1.admin_analytics import router as admin_router
from app.api.v1.heatmap import router as heatmap_router
from app.api.v1.emerging_skills import router as emerging_router
from app.api.v1.whatif import router as whatif_router
from app.api.v1.quest import router as quest_router
from app.api.v1.websockets import router as ws_router

api_router = APIRouter()

api_router.include_router(learner_router)
api_router.include_router(admin_router)
api_router.include_router(heatmap_router)
api_router.include_router(emerging_router)
api_router.include_router(whatif_router)
api_router.include_router(quest_router)
api_router.include_router(ws_router)
