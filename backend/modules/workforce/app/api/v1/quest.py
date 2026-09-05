from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas.common import APIResponse
from app.schemas.quest import (
    QuestHomeResponse,
    DataDetectiveChallenge,
    StatisticalSudokuChallenge,
    VisualizationChallenge,
    RealWorldMissionChallenge,
    QuestSubmissionRequest,
    QuestSubmissionResponse,
)
from app.services.quest_service import QuestService

router = APIRouter(prefix="/quest", tags=["Competency Quest Gamification"])

@router.get("/home", response_model=APIResponse[QuestHomeResponse])
def get_quest_home(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Returns the user's gamification hub state:
    - Level & XP progression bar (e.g. Level 7, 720/1000 XP)
    - Active daily streak (e.g. 6 days)
    - Daily Challenge availability
    - Active mission list
    - Unlocked achievements & badges
    """
    data = QuestService.get_quest_home(db, user_id=user_id)
    return APIResponse(success=True, message="Quest hub state fetched", data=data)

@router.get("/daily-challenge", response_model=APIResponse[dict])
def get_daily_challenge(
    db: Session = Depends(get_db)
):
    """Returns today's 2-minute statistical micro-challenge."""
    # Returns data detective challenge formatted as daily challenge
    challenge = QuestService.get_data_detective_challenge(db)
    return APIResponse(success=True, message="Daily challenge fetched", data=challenge.dict())

@router.get("/data-detective", response_model=APIResponse[DataDetectiveChallenge])
def get_data_detective_challenge(
    challenge_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns a realistic Indian survey dataset with injected data quality issues:
    - Missing values in mandatory demographic fields
    - Impossible numeric sentinel outliers (e.g. 9999999)
    - Invalid state/region codes
    """
    data = QuestService.get_data_detective_challenge(db, challenge_id=challenge_id)
    return APIResponse(success=True, message="Data Detective challenge fetched", data=data)

@router.get("/statistical-sudoku", response_model=APIResponse[StatisticalSudokuChallenge])
def get_statistical_sudoku(
    challenge_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns a statistical Latin Square logic puzzle with row/column constraints (mean, sum, variance).
    """
    data = QuestService.get_statistical_sudoku_challenge(db, challenge_id=challenge_id)
    return APIResponse(success=True, message="Statistical Sudoku challenge fetched", data=data)

@router.get("/visualization", response_model=APIResponse[VisualizationChallenge])
def get_visualization_challenge(
    challenge_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns a scenario requiring selection of the optimal statistical visualization.
    """
    data = QuestService.get_visualization_challenge(db, challenge_id=challenge_id)
    return APIResponse(success=True, message="Visualization challenge fetched", data=data)

@router.get("/missions", response_model=APIResponse[List[RealWorldMissionChallenge]])
def get_real_world_missions(
    db: Session = Depends(get_db)
):
    """
    Returns multi-step official statistical decision missions (e.g. Sampling design, non-response mitigation).
    """
    data = QuestService.get_real_world_missions(db)
    return APIResponse(success=True, message="Real-world missions fetched", data=data)

@router.post("/submit", response_model=APIResponse[QuestSubmissionResponse])
def submit_quest_challenge(
    request: QuestSubmissionRequest = Body(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Evaluates player answers, awards XP, handles level-ups, updates streaks, 
    unlocks badges, and provides explainable pedagogical feedback.
    """
    request.user_id = user_id
    data = QuestService.submit_quest_challenge(db, request=request)
    return APIResponse(success=True, message="Challenge evaluated successfully", data=data)
