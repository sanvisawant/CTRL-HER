from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel
from datetime import datetime

# --- Quest Home Schemas ---

class AchievementBadge(BaseModel):
    id: str
    code: str
    title: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[datetime] = None

class ActiveMissionSummary(BaseModel):
    id: str
    type: str # data_detective, statistical_sudoku, visualization, real_world_mission, daily_challenge
    title: str
    difficulty: str
    xp_reward: int
    completed: bool

class QuestHomeResponse(BaseModel):
    user_id: str
    user_name: str
    level: int # e.g. Level 7
    current_xp: int # e.g. 720
    next_level_xp: int # e.g. 1000
    progress_pct: float # 72.0%
    streak_days: int # 6 days
    daily_challenge_available: bool
    daily_challenge_id: Optional[str] = None
    daily_challenge_title: Optional[str] = None
    active_missions: List[ActiveMissionSummary]
    achievements: List[AchievementBadge]

# --- Mini-Game Schemas ---

class DataDetectiveQuestion(BaseModel):
    id: str
    prompt: str
    options: List[str]
    question_type: str # single_choice, multi_select, row_index

class DataDetectiveChallenge(BaseModel):
    id: str
    title: str
    scenario: str
    dataset_name: str
    columns: List[str]
    rows: List[Dict[str, Any]] # e.g. NSSO/PLFS sample rows with subtle data-quality bugs
    anomaly_hints: List[str]
    questions: List[DataDetectiveQuestion]
    xp_reward: int

class StatisticalSudokuCell(BaseModel):
    row: int
    col: int
    value: Optional[int] = None # None if user needs to fill
    is_fixed: bool = False
    constraint_label: Optional[str] = None

class StatisticalSudokuChallenge(BaseModel):
    id: str
    title: str
    size: int # e.g. 4 for 4x4
    rules_description: str # Statistical constraints (e.g. Latin Square, row mean, sample size weights)
    grid: List[List[Optional[int]]] # null for empty cells
    fixed_mask: List[List[bool]]
    row_constraints: List[Dict[str, Any]] # e.g. Row 0 Mean = 2.5
    col_constraints: List[Dict[str, Any]] # e.g. Col 1 Sum = 10
    xp_reward: int

class VisualizationOption(BaseModel):
    id: str
    label: str # e.g. Pie Chart, Line Chart, Histogram, Scatter Plot
    description: str

class VisualizationChallenge(BaseModel):
    id: str
    title: str
    scenario: str # e.g. Monthly unemployment rate across 5 years
    dataset_sample: List[Dict[str, Any]]
    options: List[VisualizationOption]
    xp_reward: int

class RealWorldMissionStep(BaseModel):
    step_number: int
    situation: str
    question: str
    options: List[Dict[str, str]] # id -> label

class RealWorldMissionChallenge(BaseModel):
    id: str
    title: str
    agency_context: str # e.g. MoSPI National Sample Survey Division
    problem_statement: str
    steps: List[RealWorldMissionStep]
    xp_reward: int

# --- Submission & Feedback Schemas ---

class QuestSubmissionRequest(BaseModel):
    challenge_id: str
    user_id: Optional[str] = None
    # Flexible submission payload:
    # - For Data Detective: list of selected anomaly indices / answers
    # - For Sudoku: 2D array or cell dict
    # - For Viz: selected option id
    # - For Mission: map of step -> option_id
    answers: Any

class QuestSubmissionResponse(BaseModel):
    challenge_id: str
    is_correct: bool
    score_pct: float
    xp_earned: int
    new_total_xp: int
    new_level: int
    level_up: bool
    streak_days: int
    streak_increased: bool
    detailed_feedback: str # Pedagogical explanation on why this answer is right/wrong in official statistics
    correct_solution: Optional[Any] = None
    unlocked_achievements: List[str]
