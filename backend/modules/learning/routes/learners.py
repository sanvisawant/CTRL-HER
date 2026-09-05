import uuid
import logging
from urllib.parse import unquote
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from models.learner_progress import (
    CompetencyGap,
    CompetencyGapsResponse,
    LearnerProgressProfile,
    LearnerTopicProgress,
)
from models.recommendation import PersonalizedRecommendation, PersonalizedPracticeRequest
from models.assessment import (
    QuizResponse,
    LearnerQuestion,
    QuizSession,
    MCQGenerationRequest
)
from services.learner_progress_repository import get_learner_progress_repository
from services.personalized_learning_service import get_personalized_learning_service
from services.quiz_repository import get_quiz_repository
from services.quiz_evaluator import QuizEvaluator
from routes.assessment import generate_grounded_mcqs
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learners", tags=["Learner Progress & Mastery"])

@router.get("/{learner_id}/progress", response_model=LearnerProgressProfile)
def get_learner_progress(learner_id: str):
    """
    Retrieves the overall longitudinal performance profile and topic mastery status for a learner.
    """
    repo = get_learner_progress_repository()
    profile = repo.get_progress(learner_id)
    return profile

@router.get("/{learner_id}/progress/{topic}", response_model=LearnerTopicProgress)
def get_learner_topic_progress(learner_id: str, topic: str):
    """
    Retrieves detailed longitudinal performance history, recent accuracy, and trend for a specific topic.
    """
    clean_topic = unquote(topic).strip()
    repo = get_learner_progress_repository()
    profile = repo.get_progress(learner_id)

    # Search for topic (exact match first, then case-insensitive)
    if clean_topic in profile.topics:
        return profile.topics[clean_topic]

    for t_name, progress in profile.topics.items():
        if t_name.lower() == clean_topic.lower():
            return progress

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No progress data found for topic '{clean_topic}' under learner '{learner_id}'."
    )


@router.get("/{learner_id}/competency-gaps", response_model=CompetencyGapsResponse)
def get_competency_gaps(learner_id: str):
    """Return gaps calculated from the learner's persisted assessment progress."""
    profile = get_learner_progress_repository().get_progress(learner_id)
    gaps = [
        CompetencyGap(competency=topic.topic, accuracy=topic.accuracy, status=topic.status)
        for topic in profile.topics.values()
        if topic.status == "NEEDS_REVIEW" or topic.accuracy < 70
    ]
    gaps.sort(key=lambda gap: gap.accuracy)
    return CompetencyGapsResponse(
        learner_id=learner_id,
        source="ASSESSMENT_PROGRESS",
        skill_gaps=[gap.competency for gap in gaps],
        gaps=gaps,
    )
# =====================================================================
# Phase 3E: Personalized Recommendation & Practice Endpoints
# =====================================================================

@router.get("/{learner_id}/recommendation", response_model=PersonalizedRecommendation)
def get_learner_recommendation(learner_id: str):
    """
    Returns the single highest-priority learning recommendation for the learner
    derived deterministically from their accumulated performance history.
    """
    service = get_personalized_learning_service()
    return service.get_recommendation(learner_id)


@router.post("/{learner_id}/recommendation/practice", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def start_personalized_practice(
    learner_id: str,
    request: PersonalizedPracticeRequest = PersonalizedPracticeRequest()
):
    """
    Generates a targeted, grounded practice quiz on the learner's recommended priority topic,
    reusing the existing assessment and RAG retrieval pipeline while preserving learner safety.
    """
    service = get_personalized_learning_service()
    rec = service.get_recommendation(learner_id)

    if rec.status == "NO_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start personalized practice: no learner progress history exists yet. Complete a standard quiz first."
        )

    if rec.status == "ALL_MASTERED" or not rec.recommended_topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All tracked topics have reached official mastery. No remedial practice is required."
        )

    target_topic = rec.recommended_topic
    doc_id = rec.document_id

    # If document_id could not be resolved from history, find any indexed/chunked document
    if not doc_id:
        doc_files = list(settings.CHUNKS_DIR.glob("*.json"))
        if doc_files:
            doc_id = doc_files[0].stem
        else:
            from routes.documents import _documents_db
            if _documents_db:
                doc_id = list(_documents_db.keys())[0]
            else:
                doc_id = "doc_nss_78th"

    # Calibrate difficulty from recent accuracy
    accuracy = rec.recent_accuracy or rec.accuracy or 50.0
    difficulty = QuizEvaluator.calculate_adaptive_difficulty(accuracy)

    # Generate grounded MCQs on recommended topic
    gen_req = MCQGenerationRequest(
        document_id=doc_id,
        topic=target_topic,
        count=request.count,
        difficulty=difficulty
    )

    res = generate_grounded_mcqs(gen_req)
    if res.status == "INSUFFICIENT_CONTENT":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=res.message or f"Insufficient grounded content for recommended topic '{target_topic}'."
        )

    if res.status != "GENERATED" or not res.questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.message or "Failed to generate questions for recommended practice."
        )

    # Snapshot new session
    quiz_repo = get_quiz_repository()
    quiz_id = f"quiz_{uuid.uuid4().hex[:10]}"
    created_at = datetime.utcnow().isoformat()

    session = QuizSession(
        quiz_id=quiz_id,
        learner_id=learner_id,
        document_id=doc_id,
        topic=target_topic,
        difficulty=difficulty,
        created_at=created_at,
        status="IN_PROGRESS",
        questions_snapshot=res.questions,
        adaptive_target_topic=target_topic
    )
    quiz_repo.save_quiz(session)

    # Prepare learner-safe questions (zero answers or explanations leaked)
    safe_questions = [
        LearnerQuestion(
            question_id=q.question_id,
            question=q.question,
            options=q.options,
            difficulty=q.difficulty,
            topic=q.topic,
            source=q.source
        )
        for q in res.questions
    ]

    return QuizResponse(
        quiz_id=quiz_id,
        learner_id=learner_id,
        document_id=doc_id,
        topic=target_topic,
        difficulty=difficulty,
        created_at=created_at,
        status="IN_PROGRESS",
        total_questions=len(safe_questions),
        questions=safe_questions,
        adaptive_target_topic=target_topic
    )

