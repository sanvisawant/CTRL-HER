import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import schemas
from services import CompetencyService

logger = logging.getLogger("statsaksham.routers.competencies")

router = APIRouter(
    prefix="/api/v1/competencies",
    tags=["Competencies"]
)


@router.get(
    "",
    response_model=schemas.CompetenciesGroupedResponse,
    summary="Get All Master Competencies",
    description="Returns all 33 master competencies seeded in the database grouped under the 4 official MoSPI categories."
)
def get_master_competencies(db: Session = Depends(get_db)):
    try:
        grouped = CompetencyService.get_all_competencies_grouped(db)
        return grouped
    except Exception as e:
        logger.error(f"Error fetching master competencies: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve master competencies list."
        )
