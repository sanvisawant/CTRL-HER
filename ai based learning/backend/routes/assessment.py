import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query
from models.assessment import (
    MCQItem,
    MCQOption,
    MCQSource,
    MCQGenerationRequest,
    MCQGenerationResponse,
    QuizCreateRequest,
    QuizResponse,
    LearnerQuestion,
    QuizSubmissionRequest,
    QuizResult,
    QuizSession,
    AdaptivePracticeRequest,
    AdaptivePracticeResponse
)
from models.question_bank import (
    QuestionBankItem,
    QuestionBankSaveRequest,
    QuestionBankUpdateRequest,
    QuestionBankListResponse,
    QuizFromBankRequest
)
from services.assessment_context import get_assessment_context_service
from services.llm import get_llm_service, MockLLMService
from services.mcq_validator import MCQValidator
from services.quiz_repository import get_quiz_repository
from services.question_bank_repository import get_question_bank_repository
from services.quiz_evaluator import QuizEvaluator
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessment", tags=["Intelligent Assessment Engine"])


def generate_grounded_mcqs(request: MCQGenerationRequest) -> MCQGenerationResponse:
    """
    Reusable core helper for grounded MCQ generation.
    Used by both POST /mcqs/generate and POST /quizzes.
    """
    # 1. Request validation
    if request.count < 1 or request.count > 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question count must be between 1 and 20."
        )

    # 2. Check document existence
    chunks_path = settings.CHUNKS_DIR / f"{request.document_id}.json"
    extracted_path = settings.EXTRACTED_DIR / f"{request.document_id}.json"
    embeddings_path = settings.EMBEDDINGS_DIR / f"{request.document_id}.json"

    from routes.documents import _documents_db
    doc_meta = _documents_db.get(request.document_id)

    if not doc_meta and not chunks_path.exists() and not extracted_path.exists() and not embeddings_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning material with ID '{request.document_id}' not found."
        )

    # 3. Retrieve relevant chunks & build bounded context
    context_service = get_assessment_context_service()
    context = context_service.build_context(
        document_id=request.document_id,
        topic=request.topic,
        count=request.count
    )

    # 4. Check sufficiency — avoid hallucinations if content is sparse or missing
    if not context.is_sufficient:
        logger.info(f"Insufficient content for document {request.document_id} (words: {context.total_words})")
        return MCQGenerationResponse(
            status="INSUFFICIENT_CONTENT",
            document_id=request.document_id,
            count=0,
            questions=[],
            message="Not enough relevant learning content was found to generate grounded questions."
        )

    # 5. Prepare chunks metadata for LLM source mapping
    chunks_meta = [
        {
            "chunk_id": c.chunk_id,
            "document_id": c.document_id,
            "source": c.source,
            "location": c.location,
            "locations": c.locations,
            "text": c.text,
            "chunk_index": c.chunk_index
        }
        for c in context.chunks
    ]

    # 6. Invoke LLM structured generation
    llm_service = get_llm_service()
    try:
        raw_questions = llm_service.generate_mcqs(
            context_str=context.formatted_context,
            chunks_metadata=chunks_meta,
            count=request.count,
            difficulty=request.difficulty,
            topic=context.topic
        )
    except Exception as e:
        logger.error(f"Error during LLM MCQ generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate assessment questions: {str(e)}"
        )

    # 7. Deterministic validation & quality filtering
    validated_questions = MCQValidator.validate_batch(
        raw_questions=raw_questions,
        fallback_doc_id=context.document_id,
        fallback_doc_name=context.document_name
    )

    # 8. If LLM generated fewer valid questions than requested (e.g. Due to discarded flawed options),
    # top up with reliable grounded fallback generator to fulfill the full requested quota.
    if len(validated_questions) < request.count:
        needed = request.count - len(validated_questions)
        logger.info(f"LLM produced {len(validated_questions)}/{request.count} valid questions. Topping up {needed} questions.")
        mock_raw = MockLLMService().generate_mcqs(
            context_str=context.formatted_context,
            chunks_metadata=chunks_meta,
            count=needed,
            difficulty=request.difficulty,
            topic=context.topic
        )
        mock_validated = MCQValidator.validate_batch(
            raw_questions=mock_raw,
            fallback_doc_id=context.document_id,
            fallback_doc_name=context.document_name
        )
        existing_q_texts = {q.question.strip().lower() for q in validated_questions}
        for mv in mock_validated:
            if mv.question.strip().lower() not in existing_q_texts:
                validated_questions.append(mv)
                existing_q_texts.add(mv.question.strip().lower())
                if len(validated_questions) >= request.count:
                    break

    # Trim to exact count requested if more candidates were generated
    if len(validated_questions) > request.count:
        validated_questions = validated_questions[:request.count]

    if not validated_questions:
        return MCQGenerationResponse(
            status="FAILED",
            document_id=request.document_id,
            count=0,
            questions=[],
            message="Generated questions failed quality validation criteria."
        )

    return MCQGenerationResponse(
        status="GENERATED",
        document_id=request.document_id,
        count=len(validated_questions),
        questions=validated_questions,
        message=f"Successfully generated {len(validated_questions)} grounded MCQs."
    )


# =====================================================================
# Phase 3A: Direct MCQ Generation Endpoint
# =====================================================================

@router.post("/mcqs/generate", response_model=MCQGenerationResponse)
def generate_mcqs(request: MCQGenerationRequest):
    """
    Generate multiple-choice questions grounded in specified learning material.
    Returns full question objects with answers and explanations for trainer review.
    """
    return generate_grounded_mcqs(request)


# =====================================================================
# Phase 3B-1: Quiz Session Endpoints
# =====================================================================

@router.post("/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_quiz_session(request: QuizCreateRequest):
    """
    Creates a new quiz session, generates grounded MCQs, creates an immutable server-side snapshot,
    and returns learner-safe questions (omitting correct answers and explanations).
    """
    mcq_req = MCQGenerationRequest(
        document_id=request.document_id,
        topic=request.topic,
        count=request.count,
        difficulty=request.difficulty
    )

    res = generate_grounded_mcqs(mcq_req)

    if res.status == "INSUFFICIENT_CONTENT":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=res.message or "Not enough relevant learning content to construct a quiz."
        )

    if res.status != "GENERATED" or not res.questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.message or "Could not generate validated questions for quiz."
        )

    quiz_id = f"quiz_{uuid.uuid4().hex[:10]}"
    created_at = datetime.utcnow().isoformat()

    # Create immutable session snapshot
    session = QuizSession(
        quiz_id=quiz_id,
        learner_id=request.learner_id,
        document_id=request.document_id,
        topic=request.topic,
        difficulty=request.difficulty,
        created_at=created_at,
        status="IN_PROGRESS",
        questions_snapshot=res.questions
    )

    repo = get_quiz_repository()
    repo.save_quiz(session)

    # Map to learner-safe questions (stripping correct_answer & explanation)
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
        learner_id=request.learner_id,
        document_id=request.document_id,
        topic=request.topic,
        difficulty=request.difficulty,
        created_at=created_at,
        status="IN_PROGRESS",
        total_questions=len(safe_questions),
        questions=safe_questions
    )


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz_session(quiz_id: str):
    """
    Retrieves an active quiz session.
    Never exposes correct answers or explanations through this endpoint.
    """
    repo = get_quiz_repository()
    session = repo.get_quiz(quiz_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{quiz_id}' not found."
        )

    safe_questions = [
        LearnerQuestion(
            question_id=q.question_id,
            question=q.question,
            options=q.options,
            difficulty=q.difficulty,
            topic=q.topic,
            source=q.source
        )
        for q in session.questions_snapshot
    ]

    return QuizResponse(
        quiz_id=session.quiz_id,
        learner_id=session.learner_id,
        document_id=session.document_id,
        topic=session.topic,
        difficulty=session.difficulty,
        created_at=session.created_at,
        status=session.status,
        total_questions=len(safe_questions),
        questions=safe_questions
    )


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizResult)
def submit_quiz_answers(quiz_id: str, submission: QuizSubmissionRequest):
    """
    Submits learner answers for evaluation.
    Computes scores deterministically, associates topic-level performance,
    marks the session SUBMITTED, and returns full results with explanations and citations.
    """
    repo = get_quiz_repository()
    session = repo.get_quiz(quiz_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{quiz_id}' not found."
        )

    if session.status == "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quiz '{quiz_id}' has already been submitted and cannot be re-evaluated."
        )

    try:
        result = QuizEvaluator.evaluate(session=session, submission=submission)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Update session state to SUBMITTED
    session.status = "SUBMITTED"
    session.submitted_at = result.submitted_at
    session.submission = submission
    session.result = result

    repo.update_quiz(session)

    # Phase 3D: Automatically update longitudinal learner progress & mastery profile
    try:
        from services.learner_progress_service import get_learner_progress_service
        progress_service = get_learner_progress_service()
        progress_service.update_from_quiz_result(result, session.learner_id)
    except Exception as e:
        logger.error(f"Failed to update learner progress for '{session.learner_id}': {e}")

    # Cross-Module Integration: Emit AssessmentResultContract and update P4 & P1
    try:
        from integrations.workflow_service import workflow_service
        workflow_service.on_quiz_submitted(result=result, learner_id=session.learner_id, document_id=session.document_id)
    except Exception as e:
        logger.warning(f"Notice during cross-module assessment event dispatch: {e}")

    return result


@router.get("/quizzes/{quiz_id}/result", response_model=QuizResult)
def get_quiz_result(quiz_id: str):
    """
    Retrieves the evaluation result of a submitted quiz.
    Returns 400 Bad Request if the quiz is still IN_PROGRESS.
    """
    repo = get_quiz_repository()
    session = repo.get_quiz(quiz_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{quiz_id}' not found."
        )

    if session.status != "SUBMITTED" or not session.result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quiz '{quiz_id}' is still in progress. Results are only available after submission."
        )

    return session.result


# =====================================================================
# Phase 3C: Adaptive Practice Endpoint
# =====================================================================

@router.post("/quizzes/{quiz_id}/adaptive-practice", response_model=AdaptivePracticeResponse, status_code=status.HTTP_201_CREATED)
def create_adaptive_practice_quiz(quiz_id: str, request: AdaptivePracticeRequest = AdaptivePracticeRequest()):
    """
    Analyzes a completed quiz session, identifies the learner's weakest answered topic,
    calibrates difficulty based on accuracy, generates targeted grounded MCQs without duplicates,
    and returns a new adaptive practice quiz session preserving lineage.
    """
    repo = get_quiz_repository()
    parent_session = repo.get_quiz(quiz_id)

    if not parent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent quiz session '{quiz_id}' not found."
        )

    if parent_session.status != "SUBMITTED" or not parent_session.result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parent quiz '{quiz_id}' has not been submitted yet. Adaptive practice requires a completed assessment."
        )

    # 1. Identify weakest answered topic (strictly requiring at least 1 answered question)
    weak_topic_info = QuizEvaluator.select_weakest_answered_topic(parent_session.result.topic_performance)
    if not weak_topic_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough answered performance data for adaptive practice. Please answer questions before requesting adaptive practice."
        )

    target_topic, topic_accuracy = weak_topic_info

    # 2. Calibrate adaptive difficulty
    adaptive_diff = QuizEvaluator.calculate_adaptive_difficulty(topic_accuracy)

    # 3. Generate targeted MCQs on the weak topic
    # Request extra candidates to guarantee we satisfy count after deduplication against parent quiz
    gen_count = min(request.count + 2, 20)
    gen_req = MCQGenerationRequest(
        document_id=parent_session.document_id,
        topic=target_topic,
        count=gen_count,
        difficulty=adaptive_diff
    )

    res = generate_grounded_mcqs(gen_req)
    if res.status == "INSUFFICIENT_CONTENT":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=res.message or f"Not enough learning content on '{target_topic}' for adaptive practice."
        )

    if res.status != "GENERATED" or not res.questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.message or "Failed to generate targeted adaptive questions."
        )

    # 4. Immediate duplicate prevention: filter out any questions identical to parent snapshot
    parent_normalized_questions = {
        MCQValidator.normalize_text(q.question)
        for q in parent_session.questions_snapshot
    }

    unique_questions = []
    for q in res.questions:
        norm_q = MCQValidator.normalize_text(q.question)
        if norm_q not in parent_normalized_questions:
            unique_questions.append(q)
        if len(unique_questions) >= request.count:
            break

    # If deduplication dropped all candidates, fall back to distinct questions or regenerate
    if not unique_questions:
        # If generator produced questions that happened to all match parent, keep newly validated questions
        unique_questions = res.questions[:request.count]

    # 5. Create new adaptive quiz session with preserved lineage
    new_quiz_id = f"quiz_{uuid.uuid4().hex[:10]}"
    created_at = datetime.utcnow().isoformat()
    current_round = (parent_session.adaptive_round or 0) + 1

    adaptive_session = QuizSession(
        quiz_id=new_quiz_id,
        learner_id=parent_session.learner_id,
        document_id=parent_session.document_id,
        topic=target_topic,
        difficulty=adaptive_diff,
        created_at=created_at,
        status="IN_PROGRESS",
        questions_snapshot=unique_questions,
        parent_quiz_id=parent_session.quiz_id,
        adaptive_round=current_round,
        adaptive_target_topic=target_topic
    )

    repo.save_quiz(adaptive_session)

    # 6. Map to learner-safe questions (zero answers or explanations leaked)
    safe_questions = [
        LearnerQuestion(
            question_id=q.question_id,
            question=q.question,
            options=q.options,
            difficulty=q.difficulty,
            topic=q.topic,
            source=q.source
        )
        for q in unique_questions
    ]

    return AdaptivePracticeResponse(
        status="ADAPTIVE_PRACTICE_CREATED",
        quiz_id=new_quiz_id,
        parent_quiz_id=parent_session.quiz_id,
        target_topic=target_topic,
        difficulty=adaptive_diff,
        adaptive_round=current_round,
        questions=safe_questions
    )


# =====================================================================
# Phase 3G: Trainer Question Bank & Review Endpoints
# =====================================================================

@router.post("/question-bank", response_model=QuestionBankItem, status_code=status.HTTP_201_CREATED)
def save_question_to_bank(request: QuestionBankSaveRequest):
    """
    Saves a generated or manual MCQ into the Trainer Question Bank as DRAFT.
    Enforces deterministic validation and prevents duplicate questions within the same document and topic.
    """
    repo = get_question_bank_repository()

    # 1. Server-side validation
    raw_dict = {
        "question": request.question,
        "options": [opt.model_dump() for opt in request.options],
        "correct_answer": request.correct_answer,
        "explanation": request.explanation,
        "difficulty": request.difficulty,
        "topic": request.topic,
        "source": request.source.model_dump()
    }
    validated_item, error = MCQValidator.validate_question(
        q_data=raw_dict,
        fallback_doc_id=request.source.document_id,
        fallback_doc_name=request.source.document,
        seen_questions=set()
    )
    if not validated_item:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Question validation failed: {error}"
        )

    # 2. Duplicate detection (same document + normalized topic + normalized question)
    dup = repo.find_duplicate(
        question_text=validated_item.question,
        document_id=validated_item.source.document_id,
        topic=validated_item.topic
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A similar question already exists in this question bank."
        )

    # 3. Create persistent QuestionBankItem
    now = datetime.utcnow().isoformat()
    qid = f"qb_{uuid.uuid4().hex[:10]}"
    qb_item = QuestionBankItem(
        question_id=qid,
        question=validated_item.question,
        options=validated_item.options,
        correct_answer=validated_item.correct_answer,
        explanation=validated_item.explanation,
        difficulty=validated_item.difficulty,
        topic=validated_item.topic,
        source=validated_item.source,
        status="DRAFT",
        origin=request.origin,
        created_at=now,
        updated_at=now
    )

    repo.save(qb_item)
    return qb_item


@router.get("/question-bank", response_model=QuestionBankListResponse)
def list_question_bank(
    document_id: Optional[str] = Query(None, description="Filter by source document ID"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (easy, medium, hard)"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, APPROVED, REJECTED)"),
    search: Optional[str] = Query(None, description="Search question text or topic")
):
    """
    Lists questions in the question bank with optional filtering and keyword search.
    """
    repo = get_question_bank_repository()
    items = repo.list(
        document_id=document_id,
        topic=topic,
        difficulty=difficulty,
        status=status,
        search=search
    )
    return QuestionBankListResponse(total=len(items), items=items)


@router.get("/question-bank/{question_id}", response_model=QuestionBankItem)
def get_question_bank_item(question_id: str):
    """
    Retrieves a single question bank item by ID with complete trainer details.
    """
    repo = get_question_bank_repository()
    item = repo.get(question_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question bank item '{question_id}' not found."
        )
    return item


@router.patch("/question-bank/{question_id}", response_model=QuestionBankItem)
def update_question_bank_item(question_id: str, request: QuestionBankUpdateRequest):
    """
    Updates a question bank item. Source provenance remains strictly immutable.
    Validates updated fields server-side and re-verifies duplicate rules.
    """
    repo = get_question_bank_repository()
    item = repo.get(question_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question bank item '{question_id}' not found."
        )

    # Merge candidate updates
    new_q = request.question if request.question is not None else item.question
    new_opts = request.options if request.options is not None else item.options
    new_ans = request.correct_answer if request.correct_answer is not None else item.correct_answer
    new_exp = request.explanation if request.explanation is not None else item.explanation
    new_diff = request.difficulty if request.difficulty is not None else item.difficulty
    new_topic = request.topic if request.topic is not None else item.topic

    # Validate complete updated object
    raw_dict = {
        "question": new_q,
        "options": [opt.model_dump() for opt in new_opts],
        "correct_answer": new_ans,
        "explanation": new_exp,
        "difficulty": new_diff,
        "topic": new_topic,
        "source": item.source.model_dump()
    }
    validated_item, error = MCQValidator.validate_question(
        q_data=raw_dict,
        fallback_doc_id=item.source.document_id,
        fallback_doc_name=item.source.document,
        seen_questions=set()
    )
    if not validated_item:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Question update validation failed: {error}"
        )

    # Check duplicate against other questions
    dup = repo.find_duplicate(
        question_text=validated_item.question,
        document_id=item.source.document_id,
        topic=validated_item.topic,
        exclude_id=question_id
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A similar question already exists in this question bank."
        )

    # Apply valid updates (provenance source remains unchanged)
    item.question = validated_item.question
    item.options = validated_item.options
    item.correct_answer = validated_item.correct_answer
    item.explanation = validated_item.explanation
    item.difficulty = validated_item.difficulty
    item.topic = validated_item.topic
    item.updated_at = datetime.utcnow().isoformat()

    repo.save(item)
    return item


@router.post("/question-bank/{question_id}/approve", response_model=QuestionBankItem)
def approve_question(question_id: str):
    """
    Approves a question for use in learner quizzes.
    Validates structure and sets status to APPROVED.
    """
    repo = get_question_bank_repository()
    item = repo.get(question_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question bank item '{question_id}' not found."
        )

    # Re-validate before approving
    raw_dict = {
        "question": item.question,
        "options": [opt.model_dump() for opt in item.options],
        "correct_answer": item.correct_answer,
        "explanation": item.explanation,
        "difficulty": item.difficulty,
        "topic": item.topic,
        "source": item.source.model_dump()
    }
    _, error = MCQValidator.validate_question(
        q_data=raw_dict,
        fallback_doc_id=item.source.document_id,
        fallback_doc_name=item.source.document,
        seen_questions=set()
    )
    if error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot approve invalid question: {error}"
        )

    now = datetime.utcnow().isoformat()
    item.status = "APPROVED"
    item.reviewed_at = now
    item.updated_at = now
    repo.save(item)
    return item


@router.post("/question-bank/{question_id}/reject", response_model=QuestionBankItem)
def reject_question(question_id: str):
    """
    Rejects a question, preventing it from ever being selected for learner quizzes.
    Retains the item for audit and duplicate prevention.
    """
    repo = get_question_bank_repository()
    item = repo.get(question_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question bank item '{question_id}' not found."
        )

    now = datetime.utcnow().isoformat()
    item.status = "REJECTED"
    item.reviewed_at = now
    item.updated_at = now
    repo.save(item)
    return item


@router.post("/quizzes/from-bank", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_quiz_from_question_bank(request: QuizFromBankRequest):
    """
    Assembles an official learner assessment quiz session using ONLY APPROVED items from the Question Bank.
    Guarantees zero answers or explanations are exposed in the returned learner-safe questions.
    """
    repo = get_question_bank_repository()

    # Query strictly APPROVED items
    approved_items = repo.list(
        status="APPROVED",
        topic=request.topic,
        difficulty=request.difficulty
    )

    if len(approved_items) < request.count:
        criteria_parts = []
        if request.topic:
            criteria_parts.append(f"topic='{request.topic}'")
        if request.difficulty:
            criteria_parts.append(f"difficulty='{request.difficulty}'")
        crit_desc = f" matching {', '.join(criteria_parts)}" if criteria_parts else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient approved questions in question bank{crit_desc}. Requested {request.count}, but only {len(approved_items)} approved question(s) available."
        )

    selected_items = approved_items[:request.count]

    # Convert QuestionBankItem to MCQItem for server-side evaluation snapshot
    snapshot_mcqs = [
        MCQItem(
            question_id=item.question_id,
            question=item.question,
            options=item.options,
            correct_answer=item.correct_answer,
            explanation=item.explanation,
            difficulty=item.difficulty,
            topic=item.topic,
            source=item.source
        )
        for item in selected_items
    ]

    quiz_id = f"quiz_{uuid.uuid4().hex[:10]}"
    created_at = datetime.utcnow().isoformat()
    primary_doc_id = selected_items[0].source.document_id if selected_items else "doc_question_bank"

    # Create immutable session snapshot using existing QuizRepository
    session = QuizSession(
        quiz_id=quiz_id,
        learner_id=request.learner_id,
        document_id=primary_doc_id,
        topic=request.topic or "Question Bank",
        difficulty=request.difficulty or "mixed",
        created_at=created_at,
        status="IN_PROGRESS",
        questions_snapshot=snapshot_mcqs
    )

    quiz_repo = get_quiz_repository()
    quiz_repo.save_quiz(session)

    # CRITICAL SECURITY: Strip correct_answer and explanation for learner delivery
    safe_questions = [
        LearnerQuestion(
            question_id=q.question_id,
            question=q.question,
            options=q.options,
            difficulty=q.difficulty,
            topic=q.topic,
            source=q.source
        )
        for q in snapshot_mcqs
    ]

    return QuizResponse(
        quiz_id=quiz_id,
        learner_id=request.learner_id,
        document_id=primary_doc_id,
        topic=request.topic,
        difficulty=request.difficulty or "mixed",
        created_at=created_at,
        status="IN_PROGRESS",
        total_questions=len(safe_questions),
        questions=safe_questions
    )


