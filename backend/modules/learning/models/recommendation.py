from typing import Optional, Literal
from pydantic import BaseModel, Field

class PersonalizedRecommendation(BaseModel):
    """Personalized learning recommendation based on longitudinal performance history."""
    status: Literal["RECOMMENDED", "NO_PROGRESS", "ALL_MASTERED"] = Field(
        ..., example="RECOMMENDED"
    )
    learner_id: str
    recommended_topic: Optional[str] = Field(None, example="Cluster Sampling")
    action: Optional[Literal["REVIEW", "PRACTICE", "REASSESS", "ADVANCE"]] = Field(
        None, example="PRACTICE"
    )
    priority_score: Optional[float] = Field(None, example=82.5)
    topic_status: Optional[str] = Field(None, example="NEEDS_REVIEW")
    accuracy: Optional[float] = Field(None, example=42.0)
    recent_accuracy: Optional[float] = Field(None, example=35.0)
    trend: Optional[str] = Field(None, example="DECLINING")
    reason: str
    next_step: str
    document_id: Optional[str] = Field(None, example="doc_nss_78th")

class PersonalizedPracticeRequest(BaseModel):
    """Request payload to initiate personalized practice on the recommended topic."""
    count: int = Field(default=3, ge=1, le=5, example=3)
