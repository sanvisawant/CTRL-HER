import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import schemas
from services import CompetencyService

logger = logging.getLogger("statsaksham.routers.competency_intelligence")

router = APIRouter(
    prefix="/api/v1/competency",
    tags=["Competency Intelligence & Digital Twin"]
)


@router.get(
    "/gaps/{official_id}",
    response_model=schemas.SkillGapAnalysisResponse,
    summary="Compute Skill Gap Matrix",
    description=(
        "Calculates competency gap: Gap = Required_Score - Current_Score based on role benchmarks (default 3.5). "
        "Categorizes priority into HIGH (>= 1.5), MEDIUM (0.5 - 1.5), and LOW (< 0.5). "
        "Returns matrix sorted by critical priorities first with explainable AI rationale for top 3 critical gaps."
    )
)
def get_skill_gaps(
    official_id: UUID,
    db: Session = Depends(get_db)
):
    gaps = CompetencyService.compute_skill_gaps(db, official_id)
    if not gaps:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Official with ID '{official_id}' not found or scores not yet evaluated."
        )
    return gaps


@router.get(
    "/radar/{official_id}",
    response_model=schemas.RadarResponse,
    summary="Get Recharts Radar Chart Data",
    description=(
        "Returns competency scores and role benchmarks formatted specifically for frontend Recharts Radar charts. "
        "Includes both granular per-competency points and category-level aggregations."
    )
)
def get_radar_data(
    official_id: UUID,
    db: Session = Depends(get_db)
):
    radar_data = CompetencyService.compute_radar_data(db, official_id)
    if not radar_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Radar data could not be computed for official '{official_id}'."
        )
    return radar_data


@router.get(
    "/digital-twin/{official_id}",
    response_model=schemas.CompetencyDigitalTwinResponse,
    summary="Get Competency Digital Twin",
    description=(
        "Returns real-time digital twin state: category progress averages, overall role readiness score (0-100%), "
        "and historical trajectory milestones tracing baseline evaluations and score progression over time."
    )
)
def get_digital_twin(
    official_id: UUID,
    db: Session = Depends(get_db)
):
    digital_twin = CompetencyService.compute_digital_twin(db, official_id)
    if not digital_twin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Digital Twin not found for official '{official_id}'."
        )
    return digital_twin
