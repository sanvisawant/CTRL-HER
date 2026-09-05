from typing import List, Dict, Optional
from pydantic import BaseModel

class FactorBreakdown(BaseModel):
    historical_trend: float # Weight 0.30
    department_requirement: float # Weight 0.25
    training_demand: float # Weight 0.25
    skill_gap_frequency: float # Weight 0.20

class EmergingSkillItem(BaseModel):
    competency_id: str
    competency_code: str
    competency_name: str
    domain: str
    growth_percentage: float # e.g. +32%
    demand_score: float # 0 to 100
    priority_rank: int
    factors: FactorBreakdown
    why_increasing: str # Explainable AI reason

class EmergingSkillsResponse(BaseModel):
    title: str = "Emerging & High-Demand Statistical Competencies"
    scoring_formula: str = (
        "Demand Score = (0.30 × Historical Trend) + (0.25 × Dept Requirements) + "
        "(0.25 × Training Search Demand) + (0.20 × Skill Gap Frequency)"
    )
    skills: List[EmergingSkillItem]
    top_emerging_summary: str
