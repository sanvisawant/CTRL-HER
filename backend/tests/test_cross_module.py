"""
Step 3 Test Suite: Business Flow Wiring Across P1, P2, P3, and P4
Verifies all runtime transitions, safe error handling, end-to-end demo loop,
and zero-regression smoke tests.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
from starlette.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
os.chdir(str(backend_dir))

from integrations import (
    identity_service,
    competency_service,
    MappingStatus,
    CompetencyGapContract,
    LearningRecommendationContract,
    AssessmentResultContract,
    MasteryUpdateContract,
)
from integrations.workflow_service import workflow_service
from main import app, p4_session_local, _P4_AVAILABLE

# Demo IDs
DEMO_CANONICAL_ID = "2b574d66-f752-4348-ab00-17587012f291"
DEMO_CADRE_ID = "ISS-2024-8921"
DEMO_P4_USER_ID = "usr_demo_001"
DEMO_P2_USER_ID = "U001"


# ============================================================================
# 1. P1 GAP -> P2 RECOMMENDATION (Test 1 & 2)
# ============================================================================

def test_p1_gap_to_p2_recommendation():
    """Verify P1 competency gap retrieval produces valid P2 iGOT recommendations."""
    # 1. Retrieve gaps via canonical ID
    gaps = workflow_service.get_learner_gaps(DEMO_CANONICAL_ID)
    assert isinstance(gaps, list)
    assert len(gaps) > 0, "Expected at least one competency gap for demo official"
    assert any(g.gap > 0 for g in gaps)
    assert len([g for g in gaps if g.gap > 0]) > 0

    # 2. Retrieve recommendations based on gaps
    recs = workflow_service.get_recommendations_for_learner(DEMO_CANONICAL_ID, limit=3)
    assert isinstance(recs, list)
    assert len(recs) > 0, "Expected course recommendations from P2"
    assert all(isinstance(r, LearningRecommendationContract) for r in recs)
    assert all(r.provider == "iGOT Karmayogi" for r in recs)

    # 3. Test resolve via P5 cadreId ("ISS-2024-8921")
    recs_from_cadre = workflow_service.get_recommendations_for_learner(DEMO_CADRE_ID, limit=3)
    assert len(recs_from_cadre) == len(recs)
    assert recs_from_cadre[0].course_id == recs[0].course_id


def test_p2_recommendation_to_mock_igot():
    """Verify recommendation service queries the mock iGOT course catalog."""
    rec_courses = workflow_service.get_recommendations_for_learner(DEMO_CANONICAL_ID, limit=5)
    catalog = workflow_service.igot_adapter.get_courses()
    catalog_ids = {c["id"] for c in catalog}

    for r in rec_courses:
        assert r.course_id in catalog_ids, f"Recommended course {r.course_id} must exist in iGOT catalog"


# ============================================================================
# 2. P2 RECOMMENDATION -> P3 LEARNING CONTEXT (Test 2 -> 3)
# ============================================================================

def test_p2_to_p3_learning_context():
    """Verify canonical competency correctly bridges to P3 topics and documents."""
    # Competency 2: Sampling
    ctx = workflow_service.get_learning_context_for_competency(DEMO_CANONICAL_ID, competency_id=2)
    assert ctx["status"] == "READY"
    assert ctx["competency_name"] == "Sampling"
    assert "Sampling Design & Stratification" in ctx["topics"]
    assert ctx["ready_for_rag"] is True


# ============================================================================
# 3. P3 ASSESSMENT -> P4 ANALYTICS & MASTERY (Test 3, 4, 5)
# ============================================================================

class MockQuizResult:
    """Mock structure mimicking P3 QuizResult evaluated by QuizEvaluator."""
    def __init__(self, quiz_id="quiz_test_001", score=4, total_questions=5, percentage=80.0, passed=True, topic="Sampling Design & Stratification"):
        self.quiz_id = quiz_id
        self.score = score
        self.total_questions = total_questions
        self.percentage = percentage
        self.passed = passed
        self.topic_breakdown = {
            topic: {
                "questions": total_questions,
                "correct": score,
                "accuracy": percentage
            }
        }
        self.submitted_at = datetime.utcnow().isoformat()


def test_p3_assessment_to_contracts_and_p4():
    """Verify quiz submission generates contracts, updates P4 SQLite and gamification."""
    # Initial P4 state
    initial_xp = 0
    if _P4_AVAILABLE and p4_session_local:
        with p4_session_local() as db:
            from app.models.user import User as P4User
            u = db.query(P4User).filter(P4User.id == DEMO_P4_USER_ID).first()
            if u:
                initial_xp = u.xp or 0

    mock_res = MockQuizResult(
        quiz_id=f"quiz_flow_{int(datetime.utcnow().timestamp())}",
        score=5,
        total_questions=5,
        percentage=100.0,
        passed=True,
        topic="Sampling Design & Stratification"
    )

    assessment_contract, mastery_contract = workflow_service.on_quiz_submitted(
        result=mock_res,
        learner_id=DEMO_CADRE_ID  # P5 Cadre ID
    )

    # 1. Check AssessmentResultContract
    assert assessment_contract is not None
    assert isinstance(assessment_contract, AssessmentResultContract)
    assert assessment_contract.canonical_user_id == DEMO_CANONICAL_ID
    assert assessment_contract.accuracy_pct == 100.0
    assert assessment_contract.score_calibrated_1_to_5 == 5.0  # 1.0 + (100/100)*4.0
    assert assessment_contract.competency_id == 2  # Sampling
    assert assessment_contract.competency_name == "Sampling"

    # 2. Check MasteryUpdateContract
    assert mastery_contract is not None
    assert isinstance(mastery_contract, MasteryUpdateContract)
    assert mastery_contract.canonical_user_id == DEMO_CANONICAL_ID
    assert mastery_contract.xp_awarded > 0

    # 3. Check P4 SQLite updated
    if _P4_AVAILABLE and p4_session_local:
        with p4_session_local() as db:
            from app.models.user import User as P4User
            from app.models.assessment import AssessmentAttempt as P4Attempt
            u = db.query(P4User).filter(P4User.id == DEMO_P4_USER_ID).first()
            assert u.xp > initial_xp, "P4 User XP should have increased"

            attempt = db.query(P4Attempt).filter(P4Attempt.user_id == DEMO_P4_USER_ID).order_by(P4Attempt.completed_at.desc()).first()
            assert attempt is not None
            assert attempt.passed is True
            assert attempt.score_pct == 100.0


# ============================================================================
# 4. ERROR HANDLING & UNRESOLVED MAPPINGS (Test 6, 7, 8)
# ============================================================================

def test_unknown_identity_safe_failure():
    """Verify unknown identity fails gracefully without crashing or fabricating data."""
    gaps = workflow_service.get_learner_gaps("completely_unknown_user_12345")
    assert gaps == []

    recs = workflow_service.get_recommendations_for_learner("completely_unknown_user_12345")
    assert recs == []


def test_unknown_competency_safe_failure():
    """Verify unknown competency is returned as UNKNOWN_COMPETENCY without crash."""
    ctx = workflow_service.get_learning_context_for_competency(DEMO_CANONICAL_ID, competency_id=9999)
    assert ctx["status"] == "UNKNOWN_COMPETENCY"
    assert ctx["topics"] == []


def test_requires_review_competency_preserved():
    """Verify mappings with REQUIRES_REVIEW are not silently treated as EXACT."""
    comp, status, reason = competency_service.map_p4_to_canonical("comp_timeseries")
    assert status == MappingStatus.REQUIRES_REVIEW, "comp_timeseries must remain REQUIRES_REVIEW"

    comp3, status3, reason3 = competency_service.map_p3_topic_to_canonical("Linear Algebra")
    assert status3 == MappingStatus.REQUIRES_REVIEW, "Linear Algebra must remain REQUIRES_REVIEW"


# ============================================================================
# 5. INTEGRATION HTTP API ENDPOINTS
# ============================================================================

def test_integration_api_endpoints():
    """Verify new /api/v1/integration routes are operational."""
    with TestClient(app) as client:
        # 1. Connected learner flow
        res = client.get(f"/api/v1/integration/learner-flow/{DEMO_CADRE_ID}")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "connected"
        assert data["identity"]["canonical_user_id"] == DEMO_CANONICAL_ID
        assert len(data["competency_gaps"]) > 0
        assert len(data["recommendations"]) > 0

        # 2. Recommendations endpoint
        rec_res = client.get(f"/api/v1/integration/recommendations/{DEMO_CANONICAL_ID}?limit=3")
        assert rec_res.status_code == 200
        assert len(rec_res.json()) > 0

        # 3. Learning context endpoint
        ctx_res = client.get(f"/api/v1/integration/learning-context/{DEMO_CANONICAL_ID}/2")
        assert ctx_res.status_code == 200
        assert ctx_res.json()["competency_name"] == "Sampling"


# ============================================================================
# 6. STEP 1 REGRESSION TESTS (13/13 endpoints)
# ============================================================================

def test_step1_smoke_endpoints_regression():
    """Verify all 13 consolidated endpoints from Step 1 continue to return 200 OK."""
    endpoints = [
        ("Unified Root", "GET", "/", None),
        ("Unified Health (/api/health)", "GET", "/api/health", None),
        ("Top-level Health (/health)", "GET", "/health", None),
        ("P1 Competencies (/api/v1/competencies)", "GET", "/api/v1/competencies", None),
        ("P1 Competencies Alias (/api/competencies)", "GET", "/api/competencies", None),
        ("P2 iGOT Courses (/api/igot/courses)", "GET", "/api/igot/courses", None),
        ("P2 Competency Gaps (/api/learners/U001/competency-gaps)", "GET", "/api/learners/U001/competency-gaps", None),
        ("P3 Ingested Documents (/api/documents)", "GET", "/api/documents", None),
        ("P3 Semantic Search (/api/search)", "POST", "/api/search", {"query": "sample survey", "top_k": 2}),
        ("P4 Admin Dashboard (/api/v1/admin/dashboard)", "GET", "/api/v1/admin/dashboard", None),
        ("P4 Admin Departments (/api/v1/admin/departments)", "GET", "/api/v1/admin/departments", None),
        ("P4 Quest Home (/api/v1/quest/home)", "GET", "/api/v1/quest/home", None),
        ("P4 Heatmap Analytics (/api/v1/admin/heatmap)", "GET", "/api/v1/admin/heatmap", None),
    ]

    with TestClient(app) as client:
        for name, method, path, payload in endpoints:
            if method == "GET":
                res = client.get(path)
            else:
                res = client.post(path, json=payload)
            assert res.status_code == 200, f"Endpoint {name} failed with status {res.status_code}: {res.text}"


# ============================================================================
# 7. STEP 3M: FULL END-TO-END DEMO SCENARIO
# ============================================================================

def test_full_end_to_end_demo_flow():
    """
    Executes the complete end-to-end learner loop:
    ASSESS -> IDENTIFY GAP -> RECOMMEND -> LEARN -> QUIZ SUBMIT -> MEASURE -> P4 ANALYTICS
    """
    print("\n--- Starting End-to-End Demo Flow ---")
    # Step 1: Officer identified via P5 Cadre ID
    officer_cadre_id = "ISS-2024-8921"
    identity = identity_service.resolve(officer_cadre_id)
    assert identity is not None
    print(f"Step 1: Officer identified -> {identity.full_name} ({identity.designation}), Canonical UUID: {identity.canonical_user_id}")

    # Step 2: Competency Assessment & Gaps identified
    gaps = workflow_service.get_learner_gaps(officer_cadre_id)
    assert len(gaps) > 0
    top_gap = sorted(gaps, key=lambda x: (0 if x.is_critical else 1, -x.gap))[0]
    print(f"Step 2: Gaps identified -> Total: {len(gaps)}. Top gap: '{top_gap.competency_name}' (Gap: {top_gap.gap}, Priority: {top_gap.priority})")

    # Step 3: Personalized iGOT Recommendation generated
    recommendations = workflow_service.get_recommendations_for_learner(officer_cadre_id, limit=3)
    assert len(recommendations) > 0
    chosen_rec = recommendations[0]
    print(f"Step 3: Recommendation generated -> '{chosen_rec.course_title}' ({chosen_rec.provider}, Match: {chosen_rec.match_percentage}%)")

    # Step 4: Learning Context & Document association in P3
    ctx = workflow_service.get_learning_context_for_competency(officer_cadre_id, chosen_rec.competency_id or 2)
    print(f"Step 4: Learning Context prepared -> Competency: {ctx['competency_name']}, Topics: {ctx['topics']}")

    # Step 5: Quiz Assessment Submitted
    mock_submission = MockQuizResult(
        quiz_id=f"demo_quiz_{int(datetime.utcnow().timestamp())}",
        score=4,
        total_questions=5,
        percentage=80.0,
        passed=True,
        topic="Sampling Design & Stratification"
    )
    assessment_res, mastery_upd = workflow_service.on_quiz_submitted(mock_submission, learner_id=officer_cadre_id)
    print(f"Step 5: Assessment evaluated -> Score: {assessment_res.score}/{assessment_res.total_questions} ({assessment_res.accuracy_pct}%), Calibrated Level: {assessment_res.score_calibrated_1_to_5}/5.0")

    # Step 6: P4 Analytics & Gamification updated
    assert mastery_upd is not None
    print(f"Step 6: P4 Analytics & Gamification updated -> XP Gained: +{mastery_upd.xp_awarded}, Score Delta: {mastery_upd.delta:+0.2f}")
    print("--- End-to-End Demo Flow Completed Successfully! ---\n")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING STEP 3 BUSINESS FLOW TESTS...")
    print("=" * 60)
    test_p1_gap_to_p2_recommendation()
    print("[PASS] Test 1: P1 Gaps -> P2 Recommendations")
    test_p2_recommendation_to_mock_igot()
    print("[PASS] Test 2: P2 Recommendations -> Mock iGOT Catalog")
    test_p2_to_p3_learning_context()
    print("[PASS] Test 3: P2 Recommendations -> P3 Learning Context")
    test_p3_assessment_to_contracts_and_p4()
    print("[PASS] Test 4: P3 Assessment -> AssessmentResultContract & P4 SQLite Updates")
    test_unknown_identity_safe_failure()
    print("[PASS] Test 5: Unknown Identity Safe Failure")
    test_unknown_competency_safe_failure()
    print("[PASS] Test 6: Unknown Competency Safe Failure")
    test_requires_review_competency_preserved()
    print("[PASS] Test 7: REQUIRES_REVIEW Preserved (No Silent Assumption)")
    test_integration_api_endpoints()
    print("[PASS] Test 8: Cross-Module Integration API Endpoints")
    test_full_end_to_end_demo_flow()
    print("[PASS] Test 9: Full End-to-End Demo Flow (Step 3M)")
    test_step1_smoke_endpoints_regression()
    print("[PASS] Test 10: Step 1 Smoke Endpoints Zero-Regression (13/13)")
    print("=" * 60)
    print("ALL STEP 3 BUSINESS FLOW TESTS PASSED!")
    print("=" * 60)
