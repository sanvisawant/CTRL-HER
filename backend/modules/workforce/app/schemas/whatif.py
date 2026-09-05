from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class WhatIfRequest(BaseModel):
    competency_code: str = Field(..., description="e.g. AI_ML, PYTHON, GIS, SQL, SAMPLING")
    required_level: float = Field(..., ge=1.0, le=5.0, description="Target proficiency level (1.0 - 5.0)")
    target_officials_count: int = Field(..., ge=1, description="Target number of qualified officials needed (e.g. 500)")
    department_code: Optional[str] = Field(None, description="Optional filter by department code (e.g. NSSO, CSO)")

class DepartmentImpactItem(BaseModel):
    department_code: str
    department_name: str
    current_qualified: int
    training_needed: int
    average_current_level: float

class RecommendedCourseItem(BaseModel):
    course_id: str
    title: str
    provider: str
    duration_hours: float
    expected_gain: float

class WhatIfResponse(BaseModel):
    target_skill_name: str
    target_skill_code: str
    target_skill_domain: str
    required_level: float
    target_officials_required: int
    
    current_qualified_count: int
    gap_officials_count: int
    training_required_count: int
    
    estimated_learning_hours_total: float # e.g. 7460 hours
    estimated_weeks_to_ready: float # e.g. 4.5 weeks at 10 hrs/week
    priority: str # HIGH, MEDIUM, LOW
    feasibility_score_pct: float
    
    recommended_training_strategy: str # Actionable policy strategy for official statistics administration
    recommended_courses: List[RecommendedCourseItem]
    department_breakdown: List[DepartmentImpactItem]
