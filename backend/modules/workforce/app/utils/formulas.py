"""
StatSaksham AI - P4 Explainable Analytics & Scoring Formulas
Contains transparent, non-black-box mathematical functions for workforce intelligence and gamification.
"""
from typing import Dict, Tuple

def get_competency_status(current_level: float, required_level: float = 4.0) -> Tuple[str, str]:
    """
    Returns (status_text, emoji_indicator).
    - Critical (🔴): current_level < 2.5 or gap >= 1.5
    - Moderate (🟡): 2.5 <= current_level < 3.5 or gap >= 0.5
    - Proficient (🟢): current_level >= 3.5 and gap < 0.5
    """
    gap = max(0.0, required_level - current_level)
    if current_level < 2.5 or gap >= 1.5:
        return "critical", "🔴"
    elif current_level < 3.5 or gap >= 0.5:
        return "moderate", "🟡"
    else:
        return "proficient", "🟢"

def calculate_future_skill_demand(
    historical_trend: float,       # 0 - 100 normalized
    dept_requirement: float,       # 0 - 100 normalized
    training_demand: float,        # 0 - 100 normalized
    skill_gap_frequency: float     # 0 - 100 normalized
) -> Tuple[float, Dict[str, float]]:
    """
    Transparent Future Skill Demand Scoring Formula:
    Score = (0.30 * Trend) + (0.25 * Dept Req) + (0.25 * Training Demand) + (0.20 * Gap Freq)
    Returns: (demand_score, factor_breakdown)
    """
    w_trend = 0.30
    w_dept = 0.25
    w_train = 0.25
    w_gap = 0.20

    score = (
        (w_trend * historical_trend) +
        (w_dept * dept_requirement) +
        (w_train * training_demand) +
        (w_gap * skill_gap_frequency)
    )
    score = round(min(100.0, max(0.0, score)), 1)

    return score, {
        "historical_trend": round(historical_trend, 1),
        "department_requirement": round(dept_requirement, 1),
        "training_demand": round(training_demand, 1),
        "skill_gap_frequency": round(skill_gap_frequency, 1)
    }

def calculate_whatif_scenario(
    current_qualified: int,
    target_required: int,
    avg_current_level_of_unqualified: float,
    target_level: float,
    avg_hours_per_competency_point: float = 20.0
) -> Dict[str, any]:
    """
    Calculates workforce capacity gap, estimated training hours, and policy priority.
    """
    gap_count = max(0, target_required - current_qualified)
    training_needed_count = gap_count
    
    # Delta needed per unqualified official on average
    avg_gap_level = max(0.2, target_level - avg_current_level_of_unqualified)
    total_learning_hours = round(training_needed_count * avg_gap_level * avg_hours_per_competency_point, 0)
    
    # Priority determination
    gap_ratio = gap_count / max(1, target_required)
    if gap_ratio > 0.40 or gap_count > 200:
        priority = "HIGH"
    elif gap_ratio > 0.15:
        priority = "MEDIUM"
    else:
        priority = "LOW"
        
    weeks_to_ready = round(total_learning_hours / max(1, (training_needed_count * 5.0)), 1) # assuming 5 hrs/week per official
    feasibility = round(max(10.0, 100.0 - (gap_ratio * 70.0)), 1)

    return {
        "gap_count": gap_count,
        "training_needed_count": training_needed_count,
        "total_learning_hours": total_learning_hours,
        "weeks_to_ready": weeks_to_ready,
        "priority": priority,
        "feasibility_score_pct": feasibility
    }

def calculate_xp_for_level(level: int) -> int:
    """Returns total XP required to complete current level."""
    return level * 150 + 200

def check_level_up(current_xp: int, current_level: int) -> Tuple[int, int, bool]:
    """
    Checks if XP exceeds next level threshold and returns (new_level, next_level_xp, is_level_up).
    """
    threshold = calculate_xp_for_level(current_level)
    if current_xp >= threshold:
        return current_level + 1, calculate_xp_for_level(current_level + 1), True
    return current_level, threshold, False
