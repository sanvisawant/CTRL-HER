from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin
from app.schemas.common import APIResponse
from app.schemas.emerging import EmergingSkillsResponse
from app.services.demand_service import FutureSkillDemandService

router = APIRouter(prefix="/admin", tags=["Future Skill Demand & Emerging Skills"])

@router.get("/emerging-skills", response_model=APIResponse[EmergingSkillsResponse])
def get_emerging_skills(
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """
    Returns future skill demand rankings and explainable surge scores calculated via:
    
    Demand Score = (0.30 × Historical Trend) + (0.25 × Dept Requirements) + 
                   (0.25 × Training Demand) + (0.20 × Skill Gap Frequency)
                   
    Includes natural language rationale explaining why each competency is surging in official statistics.
    """
    data = FutureSkillDemandService.get_future_skill_demand(db)
    return APIResponse(success=True, message="Emerging skills and future demand fetched", data=data)

@router.get("/skill-demand", response_model=APIResponse[EmergingSkillsResponse])
def get_skill_demand_alias(
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """Alias for /emerging-skills."""
    data = FutureSkillDemandService.get_future_skill_demand(db)
    return APIResponse(success=True, message="Skill demand data fetched", data=data)
