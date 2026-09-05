from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

class TopicAttemptHistory(BaseModel):
    """Snapshot record of a single quiz attempt on a specific topic."""
    quiz_id: str
    accuracy: float = Field(..., example=66.67)
    questions: int = Field(..., example=3)
    correct: int = Field(..., example=2)
    incorrect: int = Field(..., example=1)
    timestamp: str

class LearnerTopicProgress(BaseModel):
    """Longitudinal performance tracking for a single topic."""
    topic: str
    attempts: int = Field(default=0, example=3)
    questions_attempted: int = Field(default=0, example=9)
    correct_answers: int = Field(default=0, example=6)
    incorrect_answers: int = Field(default=0, example=3)
    accuracy: float = Field(default=0.0, example=66.67)
    recent_accuracy: float = Field(default=0.0, example=83.33)
    status: Literal["NEEDS_REVIEW", "LEARNING", "IMPROVING", "MASTERED"] = Field(
        default="LEARNING", example="IMPROVING"
    )
    trend: Literal["IMPROVING", "STABLE", "DECLINING", "INSUFFICIENT_DATA"] = Field(
        default="INSUFFICIENT_DATA", example="IMPROVING"
    )
    first_seen_at: str
    last_practiced_at: str
    history: List[TopicAttemptHistory] = Field(default_factory=list)

class LearnerProgressProfile(BaseModel):
    """Aggregate learning progress profile for an official/learner."""
    learner_id: str
    topics: Dict[str, LearnerTopicProgress] = Field(default_factory=dict)
    total_tracked_topics: int = Field(default=0)
    mastered_topics: int = Field(default=0)
    topics_needing_review: int = Field(default=0)
    improving_topics: int = Field(default=0)
    overall_accuracy: float = Field(default=0.0)

class CompetencyGap(BaseModel):
    competency: str
    accuracy: float
    status: str

class CompetencyGapsResponse(BaseModel):
    learner_id: str
    source: str
    skill_gaps: List[str] = Field(default_factory=list)
    gaps: List[CompetencyGap] = Field(default_factory=list)