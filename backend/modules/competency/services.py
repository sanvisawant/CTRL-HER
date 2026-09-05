import uuid
import logging
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from config import get_settings
from database import with_db_retry
import models
import schemas
from ai_evaluator import ai_evaluator, MASTER_COMPETENCY_DICT

logger = logging.getLogger("statsaksham.services")
settings = get_settings()


class CompetencyService:

    @staticmethod
    @with_db_retry(max_retries=3)
    def get_all_competencies_grouped(db: Session) -> schemas.CompetenciesGroupedResponse:
        """
        Fetch all 33 master competencies from the database and group them by category.
        """
        competencies = db.query(models.Competency).order_by(models.Competency.id).all()
        grouped: Dict[str, List[schemas.CompetencyOut]] = {
            "Statistical": [],
            "Technical": [],
            "Digital Governance": [],
            "Behavioural & Managerial": []
        }

        for comp in competencies:
            item = schemas.CompetencyOut(
                id=comp.id,
                category=comp.category,
                name=comp.name
            )
            if comp.category in grouped:
                grouped[comp.category].append(item)
            else:
                grouped.setdefault(comp.category, []).append(item)

        total = sum(len(v) for v in grouped.values())
        return schemas.CompetenciesGroupedResponse(
            total_competencies=total,
            categories=grouped
        )

    @staticmethod
    @with_db_retry(max_retries=3)
    def create_official_profile(
        db: Session,
        payload: schemas.OfficialProfileCreate
    ) -> schemas.ProfileCreateResponse:
        """
        1. Persist official profile
        2. Run AI evaluation across all 33 competencies
        3. Save baseline scores in official_competency_scores
        4. Log initial history records in competency_history
        """
        logger.info(f"Creating profile for official: {payload.full_name}, role: {payload.job_role}")

        official = models.Official(
            full_name=payload.full_name,
            designation=payload.designation,
            department=payload.department,
            job_role=payload.job_role,
            current_assignment=payload.current_assignment,
            education=payload.education,
            experience_years=payload.experience_years,
            previous_training=payload.previous_training or [],
            career_objective=payload.career_objective
        )
        db.add(official)
        db.flush()  # Flush to populate official.id

        # AI Competency Calibration
        evaluations = ai_evaluator.evaluate_profile(payload)

        # Batch insert scores and history
        for item in evaluations:
            score_record = models.OfficialCompetencyScore(
                official_id=official.id,
                competency_id=item.competency_id,
                current_score=item.calibrated_score,
                confidence_weight=item.confidence_weight
            )
            db.add(score_record)

            history_record = models.CompetencyHistory(
                official_id=official.id,
                competency_id=item.competency_id,
                score=item.calibrated_score,
                source_type="ai_baseline",
                reason=item.reason
            )
            db.add(history_record)

        db.commit()
        db.refresh(official)

        return schemas.ProfileCreateResponse(
            official_id=official.id,
            full_name=official.full_name,
            job_role=official.job_role,
            scores_evaluated=len(evaluations),
            message=f"Official profile registered and calibrated baseline evaluated across {len(evaluations)} competencies."
        )

    @staticmethod
    @with_db_retry(max_retries=3)
    def get_official_profile(db: Session, official_id: UUID) -> Optional[schemas.OfficialProfileOut]:
        """
        Retrieve complete profile along with calibrated competency scores.
        """
        official = db.query(models.Official).filter(models.Official.id == official_id).first()
        if not official:
            return None

        # Fetch scores joined with competencies
        scores_query = (
            db.query(
                models.OfficialCompetencyScore,
                models.Competency.name,
                models.Competency.category
            )
            .join(models.Competency, models.OfficialCompetencyScore.competency_id == models.Competency.id)
            .filter(models.OfficialCompetencyScore.official_id == official_id)
            .order_by(models.OfficialCompetencyScore.competency_id)
            .all()
        )

        score_list = []
        for score_row, comp_name, comp_category in scores_query:
            score_list.append(schemas.CompetencyScoreOut(
                competency_id=score_row.competency_id,
                competency_name=comp_name,
                category=comp_category,
                current_score=float(score_row.current_score),
                confidence_weight=float(score_row.confidence_weight or 1.0),
                last_updated=score_row.last_updated
            ))

        return schemas.OfficialProfileOut(
            id=official.id,
            full_name=official.full_name,
            designation=official.designation,
            department=official.department,
            job_role=official.job_role,
            current_assignment=official.current_assignment,
            education=official.education,
            experience_years=official.experience_years or 0,
            previous_training=official.previous_training or [],
            career_objective=official.career_objective,
            created_at=official.created_at,
            scores=score_list
        )

    @staticmethod
    @with_db_retry(max_retries=3)
    def compute_skill_gaps(db: Session, official_id: UUID) -> Optional[schemas.SkillGapAnalysisResponse]:
        """
        Compute skill gaps: Gap = Required_Score - Current_Score
        Priority:
          - Gap >= 1.5 -> "HIGH" (Critical Priority)
          - 0.5 <= Gap < 1.5 -> "MEDIUM" (Moderate Priority)
          - Gap < 0.5 -> "LOW" (Satisfactory)
        Sorted with critical priorities first.
        AI-generated rationale for top 3 critical gaps.
        """
        official = db.query(models.Official).filter(models.Official.id == official_id).first()
        if not official:
            return None

        # Fetch official's current scores
        scores = (
            db.query(
                models.OfficialCompetencyScore,
                models.Competency.name,
                models.Competency.category
            )
            .join(models.Competency, models.OfficialCompetencyScore.competency_id == models.Competency.id)
            .filter(models.OfficialCompetencyScore.official_id == official_id)
            .all()
        )

        if not scores:
            return None

        # Fetch benchmarks for official's job_role
        benchmarks = (
            db.query(models.RoleBenchmark)
            .filter(func.lower(models.RoleBenchmark.job_role) == official.job_role.lower())
            .all()
        )
        benchmark_map = {b.competency_id: float(b.required_score) for b in benchmarks}
        benchmark_source = f"Role benchmark for '{official.job_role}'" if benchmarks else f"Default MoSPI Fallback ({settings.FALLBACK_BENCHMARK_SCORE})"

        gap_items: List[schemas.CompetencyGapItem] = []
        high_cnt = 0
        med_cnt = 0
        low_cnt = 0
        total_gap = 0.0

        for s_row, c_name, c_cat in scores:
            curr_score = float(s_row.current_score)
            req_score = benchmark_map.get(s_row.competency_id, float(settings.FALLBACK_BENCHMARK_SCORE))
            gap_val = round(req_score - curr_score, 2)
            total_gap += gap_val

            if gap_val >= 1.5:
                priority = "HIGH"
                is_crit = True
                high_cnt += 1
            elif gap_val >= 0.5:
                priority = "MEDIUM"
                is_crit = False
                med_cnt += 1
            else:
                priority = "LOW"
                is_crit = False
                low_cnt += 1

            gap_items.append(schemas.CompetencyGapItem(
                competency_id=s_row.competency_id,
                category=c_cat,
                competency_name=c_name,
                current_score=curr_score,
                required_score=req_score,
                gap=gap_val,
                priority=priority,
                is_critical=is_crit
            ))

        # Sort order: HIGH first, then descending by gap magnitude
        priority_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        gap_items.sort(key=lambda item: (priority_rank[item.priority], -item.gap))

        # Top 3 critical gaps (highest gaps, prioritizing Gap >= 1.5)
        top_critical = [item.model_dump() for item in gap_items[:3] if item.gap > 0]
        rationales = ai_evaluator.generate_gap_rationales(
            official_name=official.full_name,
            job_role=official.job_role,
            top_critical_gaps=top_critical
        )

        avg_gap = round(total_gap / len(gap_items), 2) if gap_items else 0.0

        return schemas.SkillGapAnalysisResponse(
            official_id=official.id,
            full_name=official.full_name,
            job_role=official.job_role,
            benchmark_source=benchmark_source,
            total_competencies=len(gap_items),
            high_priority_count=high_cnt,
            medium_priority_count=med_cnt,
            low_priority_count=low_cnt,
            average_gap=avg_gap,
            critical_gaps_rationale=rationales,
            gaps=gap_items
        )

    @staticmethod
    @with_db_retry(max_retries=3)
    def compute_radar_data(db: Session, official_id: UUID) -> Optional[schemas.RadarResponse]:
        """
        Structure competency scores and benchmarks specifically for Recharts Radar charts:
        `category`, `competency`, `current`, `required`, `gap`
        """
        official = db.query(models.Official).filter(models.Official.id == official_id).first()
        if not official:
            return None

        scores = (
            db.query(
                models.OfficialCompetencyScore,
                models.Competency.name,
                models.Competency.category
            )
            .join(models.Competency, models.OfficialCompetencyScore.competency_id == models.Competency.id)
            .filter(models.OfficialCompetencyScore.official_id == official_id)
            .order_by(models.OfficialCompetencyScore.competency_id)
            .all()
        )

        if not scores:
            return None

        benchmarks = (
            db.query(models.RoleBenchmark)
            .filter(func.lower(models.RoleBenchmark.job_role) == official.job_role.lower())
            .all()
        )
        benchmark_map = {b.competency_id: float(b.required_score) for b in benchmarks}

        competency_points: List[schemas.RadarDataPoint] = []
        cat_stats: Dict[str, Dict[str, float]] = {}

        for s_row, c_name, c_cat in scores:
            curr = float(s_row.current_score)
            req = benchmark_map.get(s_row.competency_id, float(settings.FALLBACK_BENCHMARK_SCORE))
            gap = round(req - curr, 2)

            competency_points.append(schemas.RadarDataPoint(
                category=c_cat,
                competency=c_name,
                current=curr,
                required=req,
                gap=gap
            ))

            if c_cat not in cat_stats:
                cat_stats[c_cat] = {"curr_sum": 0.0, "req_sum": 0.0, "gap_sum": 0.0, "count": 0}
            cat_stats[c_cat]["curr_sum"] += curr
            cat_stats[c_cat]["req_sum"] += req
            cat_stats[c_cat]["gap_sum"] += gap
            cat_stats[c_cat]["count"] += 1

        category_points: List[schemas.CategoryRadarPoint] = []
        for cat_name, stats in cat_stats.items():
            cnt = stats["count"]
            category_points.append(schemas.CategoryRadarPoint(
                category=cat_name,
                current_avg=round(stats["curr_sum"] / cnt, 2),
                required_avg=round(stats["req_sum"] / cnt, 2),
                gap_avg=round(stats["gap_sum"] / cnt, 2)
            ))

        return schemas.RadarResponse(
            official_id=official.id,
            job_role=official.job_role,
            competency_radar=competency_points,
            category_radar=category_points
        )

    @staticmethod
    @with_db_retry(max_retries=3)
    def compute_digital_twin(db: Session, official_id: UUID) -> Optional[schemas.CompetencyDigitalTwinResponse]:
        """
        Returns real-time status, category averages, readiness score (0-100%),
        and historical trajectory milestones from competency_history.
        """
        official = db.query(models.Official).filter(models.Official.id == official_id).first()
        if not official:
            return None

        # Fetch current scores
        scores = (
            db.query(
                models.OfficialCompetencyScore,
                models.Competency.name,
                models.Competency.category
            )
            .join(models.Competency, models.OfficialCompetencyScore.competency_id == models.Competency.id)
            .filter(models.OfficialCompetencyScore.official_id == official_id)
            .all()
        )

        if not scores:
            return None

        benchmarks = (
            db.query(models.RoleBenchmark)
            .filter(func.lower(models.RoleBenchmark.job_role) == official.job_role.lower())
            .all()
        )
        benchmark_map = {b.competency_id: float(b.required_score) for b in benchmarks}

        cat_groups: Dict[str, Dict[str, float]] = {}
        total_effective_score = 0.0
        total_required_score = 0.0

        for s_row, c_name, c_cat in scores:
            curr = float(s_row.current_score)
            req = benchmark_map.get(s_row.competency_id, float(settings.FALLBACK_BENCHMARK_SCORE))

            effective_score = min(curr, req)
            total_effective_score += effective_score
            total_required_score += req

            if c_cat not in cat_groups:
                cat_groups[c_cat] = {"curr_sum": 0.0, "req_sum": 0.0, "effective_sum": 0.0, "count": 0}
            cat_groups[c_cat]["curr_sum"] += curr
            cat_groups[c_cat]["req_sum"] += req
            cat_groups[c_cat]["effective_sum"] += effective_score
            cat_groups[c_cat]["count"] += 1

        overall_readiness = (
            round((total_effective_score / total_required_score) * 100.0, 1)
            if total_required_score > 0 else 0.0
        )
        overall_readiness = min(100.0, max(0.0, overall_readiness))

        category_breakdowns: List[schemas.CategoryProgress] = []
        for cat_name, stats in cat_groups.items():
            cnt = stats["count"]
            readiness = (
                round((stats["effective_sum"] / stats["req_sum"]) * 100.0, 1)
                if stats["req_sum"] > 0 else 0.0
            )
            category_breakdowns.append(schemas.CategoryProgress(
                category=cat_name,
                current_average=round(stats["curr_sum"] / cnt, 2),
                required_average=round(stats["req_sum"] / cnt, 2),
                readiness_pct=min(100.0, readiness),
                competencies_count=cnt
            ))

        # Fetch history milestones
        history_rows = (
            db.query(
                models.CompetencyHistory,
                models.Competency.name,
                models.Competency.category
            )
            .join(models.Competency, models.CompetencyHistory.competency_id == models.Competency.id)
            .filter(models.CompetencyHistory.official_id == official_id)
            .order_by(desc(models.CompetencyHistory.recorded_at))
            .limit(50)
            .all()
        )

        milestones: List[schemas.HistoryMilestone] = []
        for h_row, c_name, c_cat in history_rows:
            milestones.append(schemas.HistoryMilestone(
                id=h_row.id,
                competency_id=h_row.competency_id,
                competency_name=c_name,
                category=c_cat,
                score=float(h_row.score),
                source_type=h_row.source_type or "ai_baseline",
                reason=h_row.reason,
                recorded_at=h_row.recorded_at
            ))

        # Status summary based on readiness
        if overall_readiness >= 90.0:
            status_summary = "Deployment Ready: Official demonstrates elite alignment with role requirements."
        elif overall_readiness >= 75.0:
            status_summary = "Operationally Proficient: Strong baseline with minor skill gaps in specialized modules."
        elif overall_readiness >= 50.0:
            status_summary = "Developing Capability: Moderate alignment with high-priority gaps requiring targeted interventions."
        else:
            status_summary = "Foundational Phase: Significant skill gaps identified across core domain competencies."

        return schemas.CompetencyDigitalTwinResponse(
            official_id=official.id,
            full_name=official.full_name,
            designation=official.designation,
            job_role=official.job_role,
            overall_readiness_pct=overall_readiness,
            status_summary=status_summary,
            category_breakdown=category_breakdowns,
            timeline_milestones=milestones,
            recent_updates_count=len(milestones)
        )
