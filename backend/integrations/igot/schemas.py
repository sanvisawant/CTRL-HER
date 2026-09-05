from pydantic import BaseModel
from typing import List, Optional


class IGOTCourse(BaseModel):
    id: str
    title: str
    description: str
    competencies: List[str]
    difficulty: str
    duration_hours: int
    target_roles: List[str]
    provider: str
    category: str
    url: str


class IGOTProgress(BaseModel):
    user_id: str
    course_id: str
    progress: int
    status: str


class CourseRecommendation(BaseModel):
    course_id: str
    title: str
    description: str
    competencies: List[str]
    difficulty: str
    duration_hours: int
    target_roles: List[str]
    match_percentage: float
    matched_competencies: List[str]
    missing_competencies: List[str]
    reason: str
    url: str


class IGOTRecommendationResponse(BaseModel):
    learner_id: str
    skill_gaps: List[str]
    recommendations: List[CourseRecommendation]