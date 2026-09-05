import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import schemas
from services import CompetencyService

logger = logging.getLogger("statsaksham.routers.profile")

router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Official Profile"]
)


@router.post(
    "/create",
    response_model=schemas.ProfileCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Official Profile & Ingest Competencies",
    description=(
        "Accepts multi-step onboarding payload (personal details, education, experience, previous training, "
        "and self-assessments). Triggers AI competency evaluation comparing self-ratings against credentials, "
        "persists calibrated baseline scores across all 33 competencies, logs history milestones, and returns official_id."
    )
)
def create_profile(
    payload: schemas.OfficialProfileCreate,
    db: Session = Depends(get_db)
):
    try:
        response = CompetencyService.create_official_profile(db, payload)
        return response
    except Exception as e:
        logger.error(f"Error during official profile creation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile creation and competency evaluation failed: {str(e)}"
        )


@router.get(
    "/{official_id}",
    response_model=schemas.OfficialProfileOut,
    summary="Get Official Profile & Competency Breakdown",
    description="Returns complete profile credentials alongside all 33 evaluated competency scores, categories, and confidence weights."
)
def get_profile(
    official_id: UUID,
    db: Session = Depends(get_db)
):
    profile = CompetencyService.get_official_profile(db, official_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Official with ID '{official_id}' not found."
        )
    return profile
