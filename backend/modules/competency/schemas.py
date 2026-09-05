from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


# ==========================================
# Competency Models
# ==========================================

class CompetencyBase(BaseModel):
    category: str = Field(..., description="Competency category (e.g., Statistical, Technical)")
    name: str = Field(..., description="Name of the competency")


class CompetencyOut(CompetencyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int = Field(..., description="Unique ID of the competency")


class CompetenciesGroupedResponse(BaseModel):
    total_competencies: int
    categories: Dict[str, List[CompetencyOut]]


# ==========================================
# Self-Assessment & Onboarding
# ==========================================

class SelfAssessmentItem(BaseModel):
    competency_id: int = Field(..., ge=1, le=33, description="ID of the competency (1 to 33)")
    rating: float = Field(..., ge=1.0, le=5.0, description="Self-assessed score from 1.0 to 5.0")
    notes: Optional[str] = Field(None, description="Optional self-assessment rationale or comment")


class OfficialProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name of official")
    designation: str = Field(..., min_length=2, max_length=255, description="Official designation (e.g., JSO, SSO)")
    department: str = Field(..., min_length=2, max_length=255, description="Department or division (e.g., MoSPI / NSSO)")
    job_role: str = Field(..., min_length=2, max_length=255, description="Specific job role for role benchmarking")
    current_assignment: Optional[str] = Field(None, description="Current division assignment or project")
    education: Optional[str] = Field(None, description="Educational background (e.g., M.Sc. Statistics)")
    experience_years: int = Field(0, ge=0, le=50, description="Total years of professional experience")
    previous_training: Optional[List[str]] = Field(
        default_factory=list,
        description="List of attended trainings, courses, or certifications"
    )
    career_objective: Optional[str] = Field(None, description="Target career progression or aspiration")
    self_assessments: Optional[List[SelfAssessmentItem]] = Field(
        default_factory=list,
        description="List of self-ratings for competencies (1.0 - 5.0)"
    )


class ProfileCreateResponse(BaseModel):
    official_id: UUID
    full_name: str
    job_role: str
    scores_evaluated: int
    message: str


# ==========================================
# Competency Score & Profile Details
# ==========================================

class CompetencyScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    competency_id: int
    competency_name: str
    category: str
    current_score: float
    confidence_weight: float
    last_updated: datetime


class OfficialProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    designation: str
    department: str
    job_role: str
    current_assignment: Optional[str]
    education: Optional[str]
    experience_years: int
    previous_training: Optional[List[str]]
    career_objective: Optional[str]
    created_at: datetime
    scores: List[CompetencyScoreOut]


# ==========================================
# Skill Gap Analysis
# ==========================================

GapPriority = Literal["HIGH", "MEDIUM", "LOW"]


class CompetencyGapItem(BaseModel):
    competency_id: int
    category: str
    competency_name: str
    current_score: float
    required_score: float
    gap: float
    priority: GapPriority
    is_critical: bool = Field(..., description="True if Gap >= 1.5")


class SkillGapAnalysisResponse(BaseModel):
    official_id: UUID
    full_name: str
    job_role: str
    benchmark_source: str
    total_competencies: int
    high_priority_count: int
    medium_priority_count: int
    low_priority_count: int
    average_gap: float
    critical_gaps_rationale: List[str] = Field(
        ...,
        description="AI-generated rationale explaining the top 3 critical skill gaps"
    )
    gaps: List[CompetencyGapItem]


# ==========================================
# Recharts Radar Chart Format
# ==========================================

class RadarDataPoint(BaseModel):
    category: str
    competency: str
    current: float
    required: float
    gap: float


class CategoryRadarPoint(BaseModel):
    category: str
    current_avg: float
    required_avg: float
    gap_avg: float


class RadarResponse(BaseModel):
    official_id: UUID
    job_role: str
    competency_radar: List[RadarDataPoint] = Field(
        ...,
        description="Per-competency data ready for Recharts <RadarChart data={...}>"
    )
    category_radar: List[CategoryRadarPoint] = Field(
        ...,
        description="Aggregated category radar data"
    )


# ==========================================
# Competency Digital Twin
# ==========================================

class CategoryProgress(BaseModel):
    category: str
    current_average: float
    required_average: float
    readiness_pct: float
    competencies_count: int


class HistoryMilestone(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    competency_id: int
    competency_name: str
    category: str
    score: float
    source_type: str
    reason: Optional[str]
    recorded_at: datetime


class CompetencyDigitalTwinResponse(BaseModel):
    official_id: UUID
    full_name: str
    designation: str
    job_role: str
    overall_readiness_pct: float = Field(
        ...,
        description="Overall readiness score (0-100%) against job role benchmark"
    )
    status_summary: str
    category_breakdown: List[CategoryProgress]
    timeline_milestones: List[HistoryMilestone]
    recent_updates_count: int
