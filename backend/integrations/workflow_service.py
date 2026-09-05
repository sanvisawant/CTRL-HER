"""
StatSaksham AI — Workflow & Business Flow Integration Service
Wires the end-to-end learner loop across modules:
P1 (Competency Assessment & Gaps)
    ↓
CompetencyGapContract
    ↓
P2 (Recommendation Engine & Mock iGOT)
    ↓
LearningRecommendationContract
    ↓
P3 (Learning Materials, RAG & Quizzes)
    ↓
AssessmentResultContract
    ↓
P4 (Workforce Analytics, Heatmaps & Gamification) + P1 History
"""
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID

from integrations.contracts import (
    CanonicalIdentity,
    CanonicalCompetency,
    MappingStatus,
    CompetencyGapContract,
    LearningRecommendationContract,
    LearningEvidenceContract,
    AssessmentResultContract,
    MasteryUpdateContract,
)
from integrations.identity_mapping import identity_service
import os
import sys
from pathlib import Path

# Ensure learning directory is in sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _CURRENT_DIR.parent
_LEARNING_DIR = _BACKEND_DIR / "modules" / "learning"
if _LEARNING_DIR.exists() and str(_LEARNING_DIR) not in sys.path:
    sys.path.insert(0, str(_LEARNING_DIR))

from integrations.competency_mapping import competency_service
from integrations.p1_bridge import p1_session_local, p1_models, p1_services
from services.igot_recommendation import IGOTRecommendationService
from integrations.igot.adapter import MockIGOTAdapter

# Ensure P4 directory is in sys.path for direct model access
_CURRENT_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _CURRENT_DIR.parent
_P4_DIR = _BACKEND_DIR / "modules" / "workforce"
if _P4_DIR.exists() and str(_P4_DIR) not in sys.path:
    sys.path.insert(0, str(_P4_DIR))

# P4 SQLite imports (safe dynamic loading)
try:
    from app.core.database import SessionLocal as p4_session_local
    from app.models.user import User as P4User
    from app.models.user_competency import UserCompetency as P4UserCompetency
    from app.models.assessment import AssessmentAttempt as P4AssessmentAttempt
    from app.models.competency import Competency as P4Competency
    from app.utils.formulas import check_level_up
    _P4_READY = True
except Exception as _p4_err:
    logging.getLogger("statsaksham.workflow").warning(f"P4 models not directly available in workflow: {_p4_err}")
    p4_session_local = None
    _P4_READY = False

logger = logging.getLogger("statsaksham.workflow")


class WorkflowService:
    """
    Coordinates data and event flow between P1, P2, P3, and P4 without altering
    their internal business algorithms or database configurations.
    """

    def __init__(self):
        self.igot_rec = IGOTRecommendationService()
        self.igot_adapter = MockIGOTAdapter()

    # ========================================================================
    # STEP 3B: P1 Competency Assessment -> CompetencyGapContract
    # ========================================================================

    def get_learner_gaps(self, user_identifier: str) -> List[CompetencyGapContract]:
        """
        Resolves the user identifier to a canonical official, queries P1's evaluated
        competencies and role benchmarks in Supabase, and returns CompetencyGapContracts.
        Falls back to P4 SQLite competency gaps if P1 profile is not yet initialized.
        """
        identity = identity_service.resolve(user_identifier)
        if not identity:
            logger.warning(f"Workflow: Cannot compute gaps for unknown identity '{user_identifier}'")
            return []

        contracts: List[CompetencyGapContract] = []

        # 1. Try P1 Supabase / PostgreSQL
        if identity.p1_user_id and p1_session_local and p1_services:
            try:
                with p1_session_local() as db:
                    official_uuid = UUID(identity.p1_user_id)
                    gaps_res = p1_services.CompetencyService.compute_skill_gaps(db, official_uuid)
                    if gaps_res and gaps_res.gaps:
                        for g in gaps_res.gaps:
                            contracts.append(CompetencyGapContract(
                                canonical_user_id=identity.canonical_user_id,
                                competency_id=g.competency_id,
                                competency_name=g.competency_name,
                                category=g.category,
                                current_score=float(g.current_score),
                                required_score=float(g.required_score),
                                gap=float(g.gap),
                                priority=g.priority,
                                is_critical=g.is_critical,
                                source_module="P1_COMPETENCY"
                            ))
                        logger.info(f"Retrieved {len(contracts)} competency gaps from P1 for '{identity.canonical_user_id}'")
                        return contracts
            except Exception as e:
                logger.warning(f"P1 gap computation notice (falling back): {e}")

        # 2. Fallback to P4 SQLite user_competencies if available
        if _P4_READY and p4_session_local and identity.p4_user_id:
            try:
                with p4_session_local() as db:
                    p4_ucs = (
                        db.query(P4UserCompetency, P4Competency)
                        .join(P4Competency, P4UserCompetency.competency_id == P4Competency.id)
                        .filter(P4UserCompetency.user_id == identity.p4_user_id)
                        .all()
                    )
                    for uc, comp in p4_ucs:
                        gap_val = round(max(0.0, uc.required_level - uc.current_level), 2)
                        if gap_val > 0.0:
                            # Map P4 competency to canonical
                            canon, status, _ = competency_service.map_p4_to_canonical(comp.id)
                            cid = canon.competency_id if canon else 0
                            cname = canon.name if canon else comp.name
                            ccat = canon.category if canon else comp.domain
                            priority = "HIGH" if (gap_val >= 1.5 or uc.current_level < 2.5) else ("MEDIUM" if gap_val >= 0.5 else "LOW")
                            contracts.append(CompetencyGapContract(
                                canonical_user_id=identity.canonical_user_id,
                                competency_id=cid,
                                competency_name=cname,
                                category=ccat,
                                current_score=float(uc.current_level),
                                required_score=float(uc.required_level),
                                gap=gap_val,
                                priority=priority,
                                is_critical=(priority == "HIGH"),
                                source_module="P4_ANALYTICS"
                            ))
                    if contracts:
                        logger.info(f"Retrieved {len(contracts)} competency gaps from P4 for '{identity.canonical_user_id}'")
                        return contracts
            except Exception as e:
                logger.warning(f"P4 gap fallback notice: {e}")

        return contracts

    # ========================================================================
    # STEP 3B & 3C: P1 Gaps -> P2 Recommendations -> iGOT Adapter
    # ========================================================================

    def get_recommendations_for_learner(
        self,
        user_identifier: str,
        limit: int = 5
    ) -> List[LearningRecommendationContract]:
        """
        Takes a learner identity, fetches their real competency gaps,
        and invokes P2's recommendation engine against the iGOT course catalog.
        """
        identity = identity_service.resolve(user_identifier)
        if not identity:
            logger.warning(f"Workflow: Cannot recommend courses for unknown identity '{user_identifier}'")
            return []

        gaps = self.get_learner_gaps(user_identifier)
        if not gaps:
            logger.info(f"No competency gaps found for '{user_identifier}'. Recommending foundational courses.")
            skill_gap_names = ["Python", "Statistics", "Data Analysis"]
        else:
            # Sort by critical/high priority first, selecting positive gaps
            sorted_gaps = sorted(gaps, key=lambda x: (0 if x.is_critical else 1, -x.gap))
            positive_gaps = [g for g in sorted_gaps if g.gap > 0]
            skill_gap_names = [g.competency_name for g in positive_gaps[:5]] if positive_gaps else ["Python", "Statistics", "Data Analysis"]

        # Query existing P2 recommendation service
        p2_learner_id = identity.p2_learner_id or "U001"
        rec_res = self.igot_rec.recommend_courses(
            learner_id=p2_learner_id,
            skill_gaps=skill_gap_names,
            role=identity.designation,
            limit=limit
        )

        courses_list = rec_res.get("recommendations", []) if isinstance(rec_res, dict) else rec_res
        contracts: List[LearningRecommendationContract] = []
        for course in courses_list:
            # Match back to highest-priority triggering competency
            matching_comp_id = 0
            matching_comp_name = "General"
            for g in gaps:
                if any(g.competency_name.lower() in c.lower() for c in course.get("matched_competencies", [])):
                    matching_comp_id = g.competency_id
                    matching_comp_name = g.competency_name
                    break

            contracts.append(LearningRecommendationContract(
                canonical_user_id=identity.canonical_user_id,
                competency_id=matching_comp_id,
                competency_name=matching_comp_name,
                course_id=course["course_id"],
                course_title=course["title"],
                provider=course.get("provider", "iGOT Karmayogi"),
                match_percentage=float(course.get("match_percentage", 0.0)),
                source_module="P2_IGOT"
            ))

        return contracts

    # ========================================================================
    # STEP 3D: P2 Recommendation -> P3 Learning Material & Context
    # ========================================================================

    def get_learning_context_for_competency(
        self,
        user_identifier: str,
        competency_id: int
    ) -> Dict[str, Any]:
        """
        Maps a canonical competency to verified P3 document topics and ingested PDFs,
        establishing the learning context for RAG and targeted quiz assessment.
        """
        identity = identity_service.resolve(user_identifier)
        cid = identity.canonical_user_id if identity else user_identifier

        canon = competency_service.get_canonical_by_id(competency_id)
        if not canon:
            return {
                "canonical_user_id": cid,
                "competency_id": competency_id,
                "status": "UNKNOWN_COMPETENCY",
                "topics": [],
                "documents": []
            }

        topics = competency_service.get_p3_topics_for_competency(competency_id)

        # Match with ingested documents in P3
        from routes.documents import _documents_db
        matching_docs = []
        for doc_id, doc_info in _documents_db.items():
            doc_title = getattr(doc_info, "filename", "") or ""
            doc_desc = getattr(doc_info, "description", "") or ""
            if any(t.lower() in doc_title.lower() for t in topics) or any(t.lower() in doc_desc.lower() for t in topics):
                matching_docs.append({
                    "document_id": doc_id,
                    "filename": doc_title,
                    "pages": getattr(doc_info, "pages", 1)
                })

        return {
            "canonical_user_id": cid,
            "competency_id": canon.competency_id,
            "competency_name": canon.name,
            "category": canon.category,
            "status": "READY",
            "topics": topics,
            "documents": matching_docs,
            "ready_for_rag": len(matching_docs) > 0 or len(topics) > 0
        }

    # ========================================================================
    # STEP 3E & 3F: P3 Quiz Submitted -> P4 Analytics + P1 History Update
    # ========================================================================

    def on_quiz_submitted(
        self,
        result: Any,
        learner_id: str,
        document_id: Optional[str] = None
    ) -> Tuple[AssessmentResultContract, Optional[MasteryUpdateContract]]:
        """
        Invoked when a learner submits a P3 quiz.
        1. Emits AssessmentResultContract
        2. Resolves canonical identity and canonical competency
        3. Updates P4 SQLite (assessment_attempts, user_competencies, XP gamification)
        4. Updates P1 Supabase history if reachable
        """
        identity = identity_service.resolve(learner_id)
        canonical_uid = identity.canonical_user_id if identity else learner_id
        p4_uid = identity.p4_user_id if identity else "usr_demo_001"

        # Determine dominant topic from quiz breakdown
        topic_name = "General"
        if hasattr(result, "topic_breakdown") and result.topic_breakdown:
            topic_name = next(iter(result.topic_breakdown.keys()))
        elif hasattr(result, "topic_performance") and result.topic_performance:
            topic_name = result.topic_performance[0].topic

        # Map topic to canonical competency
        canon_comp, comp_status, _ = competency_service.map_p3_topic_to_canonical(topic_name)
        comp_id = canon_comp.competency_id if canon_comp else None
        comp_name = canon_comp.name if canon_comp else None
        p4_comp_id = canon_comp.p4_id if canon_comp else None

        # Normalized 1.0 to 5.0 score calculation
        score_calibrated = round(1.0 + (float(result.percentage) / 100.0) * 4.0, 2)
        score_calibrated = min(5.0, max(1.0, score_calibrated))
        is_passed = bool(getattr(result, "passed", float(result.percentage) >= 60.0))

        # 1. Assessment Result Contract
        assessment_contract = AssessmentResultContract(
            canonical_user_id=canonical_uid,
            quiz_id=result.quiz_id,
            topic=topic_name,
            competency_id=comp_id,
            competency_name=comp_name,
            total_questions=result.total_questions,
            score=result.score,
            accuracy_pct=float(result.percentage),
            score_calibrated_1_to_5=score_calibrated,
            passed=is_passed,
            source_module="P3_ASSESSMENT"
        )

        mastery_contract: Optional[MasteryUpdateContract] = None

        # 2. Update P4 Analytics & Gamification (SQLite)
        if _P4_READY and p4_session_local:
            try:
                with p4_session_local() as p4_db:
                    # Record attempt
                    attempt_row = P4AssessmentAttempt(
                        id=f"att_{uuid.uuid4().hex[:12]}",
                        user_id=p4_uid,
                        competency_id=p4_comp_id,
                        assessment_title=f"Quiz: {topic_name}",
                        assessment_type="quiz",
                        score_achieved=score_calibrated,
                        max_score=5.0,
                        score_pct=float(result.percentage),
                        passed=bool(result.passed),
                        completed_at=datetime.utcnow()
                    )
                    p4_db.add(attempt_row)

                    # Update User Competency Level
                    prev_score = 1.0
                    if p4_comp_id:
                        uc = (
                            p4_db.query(P4UserCompetency)
                            .filter(
                                P4UserCompetency.user_id == p4_uid,
                                P4UserCompetency.competency_id == p4_comp_id
                            )
                            .first()
                        )
                        if uc:
                            prev_score = uc.current_level
                            uc.current_level = round(max(uc.current_level, score_calibrated), 2)
                            uc.gap = max(0.0, uc.required_level - uc.current_level)
                            uc.last_assessed_at = datetime.utcnow()
                        else:
                            uc = P4UserCompetency(
                                id=f"uc_{uuid.uuid4().hex[:12]}",
                                user_id=p4_uid,
                                competency_id=p4_comp_id,
                                current_level=score_calibrated,
                                required_level=4.0,
                                baseline_level=1.0,
                                gap=max(0.0, 4.0 - score_calibrated),
                                last_assessed_at=datetime.utcnow()
                            )
                            p4_db.add(uc)

                    # Gamification: Award XP
                    xp_gain = 50 if result.passed else 20
                    if result.percentage >= 80.0:
                        xp_gain += 30  # Mastery excellence bonus

                    user_row = p4_db.query(P4User).filter(P4User.id == p4_uid).first()
                    if user_row:
                        user_row.xp = (user_row.xp or 0) + xp_gain
                        new_lvl, _, _ = check_level_up(user_row.xp, user_row.level or 1)
                        user_row.level = new_lvl
                        user_row.last_active_date = datetime.utcnow()

                    p4_db.commit()

                    delta = round(score_calibrated - prev_score, 2)
                    mastery_contract = MasteryUpdateContract(
                        canonical_user_id=canonical_uid,
                        competency_id=comp_id or 0,
                        competency_name=comp_name or topic_name,
                        previous_score=prev_score,
                        new_score=score_calibrated,
                        delta=delta,
                        xp_awarded=xp_gain,
                        source_module="P4_ANALYTICS"
                    )
                    logger.info(f"P4 SQLite updated successfully for user '{p4_uid}'. XP gained: +{xp_gain}")
            except Exception as e:
                logger.warning(f"Workflow: Notice while updating P4 analytics: {e}")

        # 3. Update P1 Supabase History (if reachable)
        if identity and identity.p1_user_id and comp_id and p1_session_local and p1_models:
            try:
                with p1_session_local() as p1_db:
                    hist_entry = p1_models.CompetencyHistory(
                        official_id=UUID(identity.p1_user_id),
                        competency_id=comp_id,
                        score=score_calibrated,
                        source_type="assessment",
                        reason=f"P3 Grounded Quiz '{result.quiz_id}' on {topic_name} ({result.percentage}%)",
                        recorded_at=datetime.utcnow()
                    )
                    p1_db.add(hist_entry)

                    # Update current score if higher
                    score_row = (
                        p1_db.query(p1_models.OfficialCompetencyScore)
                        .filter(
                            p1_models.OfficialCompetencyScore.official_id == UUID(identity.p1_user_id),
                            p1_models.OfficialCompetencyScore.competency_id == comp_id
                        )
                        .first()
                    )
                    if score_row and score_calibrated > float(score_row.current_score):
                        score_row.current_score = score_calibrated
                        score_row.last_updated = datetime.utcnow()

                    p1_db.commit()
                    logger.info(f"P1 Supabase history updated for official '{identity.p1_user_id}', competency #{comp_id}")
            except Exception as e:
                logger.warning(f"Workflow: Notice while logging P1 Supabase history (offline mode preserved): {e}")

        return assessment_contract, mastery_contract


# Singleton instance
workflow_service = WorkflowService()
