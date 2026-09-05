from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin
from app.schemas.common import APIResponse
from app.schemas.heatmap import HeatmapMatrixResponse
from app.services.heatmap_service import HeatmapService

router = APIRouter(prefix="/admin", tags=["Workforce Heatmap"])

@router.get("/heatmap", response_model=APIResponse[HeatmapMatrixResponse])
def get_skill_heatmap(
    domain: Optional[str] = Query(None, description="Filter by domain: Statistical, Technical, Digital, Behavioural"),
    department: Optional[str] = Query(None, description="Filter by department code: NSSO, CSO, FOD, NAD, ESD, SDRD"),
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """
    Returns the Department × Competency Status Heatmap matrix.
    
    Status Indicators:
    - 🔴 Critical (< 2.5) - Immediate training intervention required
    - 🟡 Moderate (2.5 - 3.4) - Targeted upskilling recommended
    - 🟢 Proficient (>= 3.5) - Meets or exceeds operational benchmark
    
    Supports bidirectional slicing:
    - Department -> Competencies
    - Competency -> Departments
    """
    data = HeatmapService.get_skill_heatmap(db, domain_filter=domain, department_filter=department)
    return APIResponse(success=True, message="Skill heatmap matrix generated successfully", data=data)
