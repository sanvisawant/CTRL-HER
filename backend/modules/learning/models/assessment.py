from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class MCQOption(BaseModel):
    id: Literal["A", "B", "C", "D"] = Field(..., example="A")
    text: str = Field(..., min_length=1, example="Stratified sampling")

class MCQSource(BaseModel):
    document_id: str = Field(..., example="doc_nss_78th")
    document: str = Field(..., example="NSS_78th_Round_Multiple_Indicator_Survey.pdf")
    chunk_ids: List[str] = Field(default_factory=list, example=["doc_nss_78th_chunk_001"])
    locations: List[str] = Field(default_factory=list, example=["Page 2"])

class MCQItem(BaseModel):
    question_id: str = Field(..., example="mcq_001")
    question: str = Field(..., min_length=5, example="What is the primary purpose of stratified sampling?")
    options: List[MCQOption] = Field(..., min_length=4, max_length=4)
    correct_answer: Literal["A", "B", "C", "D"] = Field(..., example="B")
    explanation: str = Field(..., min_length=5, example="Stratified sampling divides a heterogeneous population into homogeneous subgroups.")
    difficulty: Literal["easy", "medium", "hard"] = Field(default="medium")
    topic: str = Field(default="General", example="Sampling Techniques")
    source: MCQSource

class MCQGenerationRequest(BaseModel):
    document_id: str = Field(..., min_length=1, example="doc_nss_78th")
    topic: Optional[str] = Field(default=None, example="Sampling Design")
    count: int = Field(default=10, ge=1, le=20, example=5)
    difficulty: Literal["easy", "medium", "hard"] = Field(default="medium")

class MCQGenerationResponse(BaseModel):
    status: Literal["GENERATED", "INSUFFICIENT_CONTENT", "FAILED"] = Field(..., example="GENERATED")
    document_id: str
    count: int
    questions: List[MCQItem] = Field(default_factory=list)
    message: Optional[str] = None

# =====================================================================
# Phase 3B-1 Quiz Session & Evaluation Models
# =====================================================================

class QuizCreateRequest(BaseModel):
    document_id: str = Field(..., min_length=1, example="doc_nss_78th")
    topic: Optional[str] = Field(default=None, example="Sampling Design")
    count: int = Field(default=5, ge=1, le=20, example=5)
    difficulty: Literal["easy", "medium", "hard"] = Field(default="medium")
    learner_id: str = Field(default="learner_default", example="learner_001")

class LearnerQuestion(BaseModel):
    """
    Learner-safe question serving model.
    CRITICAL: Never exposes correct_answer or explanation before submission.
    """
    question_id: str = Field(..., example="mcq_001")
    question: str = Field(..., example="What is the primary purpose of stratified sampling?")
    options: List[MCQOption] = Field(..., min_length=4, max_length=4)
    difficulty: Literal["easy", "medium", "hard"]
    topic: str
    source: MCQSource

class QuizResponse(BaseModel):
    quiz_id: str = Field(..., example="quiz_12345678")
    learner_id: str
    document_id: str
    topic: Optional[str] = None
    difficulty: str
    created_at: str
    status: Literal["IN_PROGRESS", "SUBMITTED"] = "IN_PROGRESS"
    total_questions: int
    questions: List[LearnerQuestion]
    parent_quiz_id: Optional[str] = None
    adaptive_round: int = 0
    adaptive_target_topic: Optional[str] = None

class SingleAnswerSubmission(BaseModel):
    question_id: str = Field(..., min_length=1, example="mcq_001")
    selected_answer: Optional[Literal["A", "B", "C", "D"]] = Field(default=None, example="B")

class QuizSubmissionRequest(BaseModel):
    answers: List[SingleAnswerSubmission] = Field(default_factory=list)

class QuestionEvaluationResult(BaseModel):
    question_id: str
    question: str
    options: List[MCQOption]
    selected_answer: Optional[str] = None
    correct_answer: str
    is_correct: bool
    explanation: str
    difficulty: str
    topic: str
    source: MCQSource

class TopicPerformance(BaseModel):
    topic: str
    questions: int
    correct: int
    incorrect: int
    unanswered: int
    accuracy: float = Field(..., example=60.0)

class QuizResult(BaseModel):
    quiz_id: str
    learner_id: str
    document_id: str
    total_questions: int
    answered_questions: int
    correct_answers: int
    incorrect_answers: int
    unanswered_questions: int
    score: int
    percentage: float
    question_results: List[QuestionEvaluationResult]
    topic_performance: List[TopicPerformance]
    strongest_topic: Optional[str] = None
    weakest_topic: Optional[str] = None
    overall_feedback: str
    submitted_at: str

class QuizSession(BaseModel):
    """Internal server-side snapshot session model."""
    quiz_id: str
    learner_id: str
    document_id: str
    topic: Optional[str] = None
    difficulty: str = "medium"
    created_at: str
    submitted_at: Optional[str] = None
    status: Literal["IN_PROGRESS", "SUBMITTED"] = "IN_PROGRESS"
    questions_snapshot: List[MCQItem]
    submission: Optional[QuizSubmissionRequest] = None
    result: Optional[QuizResult] = None
    parent_quiz_id: Optional[str] = None
    adaptive_round: int = 0
    adaptive_target_topic: Optional[str] = None

# =====================================================================
# Phase 3C: Adaptive Learning Models
# =====================================================================

class AdaptivePracticeRequest(BaseModel):
    count: int = Field(default=3, ge=1, le=5, example=3)

class AdaptivePracticeResponse(BaseModel):
    status: Literal["ADAPTIVE_PRACTICE_CREATED"] = "ADAPTIVE_PRACTICE_CREATED"
    quiz_id: str
    parent_quiz_id: str
    target_topic: str
    difficulty: str
    adaptive_round: int
    questions: List[LearnerQuestion]

