from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin
from app.schemas.common import APIResponse
from app.schemas.analytics import (
    AdminDashboardResponse,
    AdminOverviewKPIs,
    TrainingEffectivenessResponse,
)
from app.services.admin_analytics_service import AdminAnalyticsService

router = APIRouter(prefix="/admin", tags=["Admin Intelligence & Analytics"])

@router.get("/dashboard", response_model=APIResponse[AdminDashboardResponse])
def get_admin_dashboard(
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """
    Returns complete organization-level workforce intelligence:
    - Workforce KPIs (Officials: 12,450, Avg Competency: 3.4/5, Critical Gaps: 18, Completion: 76%)
    - Domain Competency Breakdown (Statistical 4.1, Technical 2.9, Digital 3.5, Behavioural 4.0)
    - Competency Score Distribution
    - Department-level Analytics Summary (NSSO, CSO, FOD, NAD, ESD, SDRD)
    - Training Effectiveness Progression (+23.4% average improvement)
    """
    data = AdminAnalyticsService.get_admin_dashboard(db)
    return APIResponse(success=True, message="Admin dashboard analytics fetched successfully", data=data)

@router.get("/workforce", response_model=APIResponse[AdminOverviewKPIs])
def get_workforce_kpis(
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """Returns top-level workforce KPI numbers."""
    dashboard = AdminAnalyticsService.get_admin_dashboard(db)
    return APIResponse(success=True, message="Workforce KPIs fetched", data=dashboard.kpis)

@router.get("/departments", response_model=APIResponse[list])
def get_department_analytics(
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """Returns department-wise competency, gap density, and participation metrics."""
    dashboard = AdminAnalyticsService.get_admin_dashboard(db)
    return APIResponse(success=True, message="Department analytics fetched", data=dashboard.department_summary)

@router.get("/training-effectiveness", response_model=APIResponse[TrainingEffectivenessResponse])
def get_training_effectiveness(
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """
    Returns Before vs After training competency gains across all subjects (+23% average improvement).
    """
    data = AdminAnalyticsService.get_training_effectiveness(db)
    return APIResponse(success=True, message="Training effectiveness analytics fetched", data=data)
