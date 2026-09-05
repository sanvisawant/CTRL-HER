from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class HeatmapCell(BaseModel):
    department_id: str
    department_code: str
    department_name: str
    competency_id: str
    competency_code: str
    competency_name: str
    domain: str
    average_level: float # e.g. 3.8
    required_level: float # e.g. 4.0
    gap: float # e.g. 0.2
    status: str # "critical", "moderate", "proficient"
    indicator: str # "🔴", "🟡", "🟢"
    officials_count: int

class HeatmapDepartmentHeader(BaseModel):
    id: str
    code: str
    name: str

class HeatmapCompetencyHeader(BaseModel):
    id: str
    code: str
    name: str
    domain: str

class HeatmapMatrixResponse(BaseModel):
    departments: List[HeatmapDepartmentHeader]
    competencies: List[HeatmapCompetencyHeader]
    cells: List[HeatmapCell]
    # Matrix representation where row is Department and columns are Competency codes
    grid: Dict[str, Dict[str, HeatmapCell]]
    summary: Dict[str, int] # critical: X, moderate: Y, proficient: Z
    legend: Dict[str, str]
