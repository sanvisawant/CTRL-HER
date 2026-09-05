from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from datetime import datetime

# --- Learner Analytics Schemas ---

class LearningHoursStats(BaseModel):
    this_week: float # e.g. 5.2 hrs
    this_month: float # e.g. 18.4 hrs
    total: float # e.g. 42.0 hrs
    weekly_trend: List[Dict[str, Any]] # day -> hours

class CourseProgressItem(BaseModel):
    course_id: str
    course_title: str
    provider: str
    progress_pct: float
    status: str
    hours_spent: float

class CompetencyImprovementItem(BaseModel):
    competency_id: str
    competency_name: str
    domain: str
    before_level: float
    current_level: float
    delta: float # e.g. +0.8
    improvement_pct: float
    status: str

class AssessmentHistoryItem(BaseModel):
    id: str
    title: str
    assessment_type: str
    score_pct: float
    passed: bool
    completed_at: datetime
    ai_insight: Optional[str] = None

class LearnerAnalyticsResponse(BaseModel):
    user_id: str
    user_name: str
    designation: str
    department_name: str
    overall_competency_score: float # 3.4 / 5.0
    profile_completion_pct: float
    learning_hours: LearningHoursStats
    course_progress: List[CourseProgressItem]
    competency_improvements: List[CompetencyImprovementItem]
    recent_assessments: List[AssessmentHistoryItem]

# --- Admin Analytics Schemas ---

class AdminOverviewKPIs(BaseModel):
    total_officials: int # e.g. 12450 (or seeded size)
    average_competency: float # e.g. 3.4
    critical_skill_gaps_count: int # e.g. 18
    training_completion_rate_pct: float # e.g. 76.0
    active_learners_count: int
    total_courses_completed: int

class DomainCompetencyBreakdown(BaseModel):
    domain: str # Statistical, Technical, Digital, Behavioural
    average_score: float
    required_benchmark: float
    officials_assessed: int
    critical_count: int

class CompetencyDistributionBucket(BaseModel):
    level_range: str # e.g. "1.0 - 2.0", "2.1 - 3.0", "3.1 - 4.0", "4.1 - 5.0"
    count: int
    percentage: float

class DepartmentAnalyticsItem(BaseModel):
    department_id: str
    department_code: str
    department_name: str
    total_officials: int
    average_competency: float
    critical_gaps_count: int
    training_completion_pct: float
    top_strengths: List[str]
    top_critical_gaps: List[str]

class TrainingEffectivenessItem(BaseModel):
    competency_id: str
    competency_name: str
    domain: str
    before_score: float
    after_score: float
    absolute_gain: float
    percentage_improvement: float
    officials_trained: int

class TrainingEffectivenessResponse(BaseModel):
    overall_average_improvement_pct: float # e.g. +23%
    total_officials_trained: int
    competency_breakdown: List[TrainingEffectivenessItem]
    summary_insight: str

class AdminDashboardResponse(BaseModel):
    kpis: AdminOverviewKPIs
    domain_breakdown: List[DomainCompetencyBreakdown]
    distribution: List[CompetencyDistributionBucket]
    department_summary: List[DepartmentAnalyticsItem]
    training_effectiveness_summary: TrainingEffectivenessResponse
