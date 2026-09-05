from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas.common import APIResponse
from app.schemas.analytics import LearnerAnalyticsResponse
from app.services.learner_analytics_service import LearnerAnalyticsService

router = APIRouter(prefix="/learner", tags=["Learner Analytics"])

@router.get("/analytics", response_model=APIResponse[LearnerAnalyticsResponse])
def get_learner_analytics(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Returns complete learner progress & competency intelligence:
    - Learning hours (this week, this month, total)
    - Active course progress & completion
    - Competency improvement delta (Before vs Now)
    - Assessment history & AI insights
    """
    data = LearnerAnalyticsService.get_learner_analytics(db, user_id=user_id)
    return APIResponse(success=True, message="Learner analytics fetched successfully", data=data)

@router.get("/progress", response_model=APIResponse[dict])
def get_learner_progress_summary(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Returns a quick summary of learning hours and course progress."""
    full = LearnerAnalyticsService.get_learner_analytics(db, user_id=user_id)
    summary = {
        "learning_hours": full.learning_hours,
        "course_progress": full.course_progress,
        "profile_completion_pct": full.profile_completion_pct
    }
    return APIResponse(success=True, message="Learner progress summary fetched", data=summary)

@router.get("/competency-improvements", response_model=APIResponse[list])
def get_competency_improvements(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Returns before vs after competency progression across all domains."""
    full = LearnerAnalyticsService.get_learner_analytics(db, user_id=user_id)
    return APIResponse(success=True, message="Competency improvements fetched", data=full.competency_improvements)
