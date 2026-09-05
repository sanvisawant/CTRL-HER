"""
StatSaksham AI — Live HTTP Validation Script for Step 7B-2
Tests real HTTP endpoints and full learner/trainer workflows.
"""
import time
import requests

BASE = "http://localhost:8000"

def main():
    print("=== 1. Health and Baseline Checks ===")
    r = requests.get(f"{BASE}/api/health")
    assert r.status_code == 200, f"Health failed: {r.status_code}"
    print("  [PASS] /api/health -> 200")

    r = requests.get(f"{BASE}/api/documents")
    assert r.status_code == 200, f"Documents failed: {r.status_code}"
    docs = r.json().get("documents", [])
    print(f"  [PASS] /api/documents -> 200 (count: {len(docs)})")

    r = requests.get(f"{BASE}/api/v1/competencies")
    assert r.status_code == 200, f"Competencies failed: {r.status_code}"
    print(f"  [PASS] /api/v1/competencies -> 200 (count: {len(r.json())})")

    r = requests.get(f"{BASE}/api/v1/integration/learner-flow/2b574d66-f752-4348-ab00-17587012f291")
    assert r.status_code == 200, f"Learner flow failed: {r.status_code}"
    print("  [PASS] /api/v1/integration/learner-flow/... -> 200")

    print("\n=== 2. Real Learner Quiz & Progress Workflow ===")
    create_payload = {
        "document_id": "doc_nss_78th",
        "topic": "Sampling Design",
        "count": 3,
        "difficulty": "medium",
        "learner_id": "U001"
    }
    r_quiz = requests.post(f"{BASE}/api/assessment/quizzes", json=create_payload)
    assert r_quiz.status_code == 201, f"Create quiz failed: {r_quiz.status_code} {r_quiz.text}"
    quiz_data = r_quiz.json()
    quiz_id = quiz_data["quiz_id"]
    questions = quiz_data["questions"]
    print(f"  [PASS] Created quiz: {quiz_id} with {len(questions)} questions")

    # Verify learner question safety
    for q in questions:
        assert "correct_answer" not in q, "LEAK: correct_answer exposed to learner!"
        assert "explanation" not in q, "LEAK: explanation exposed to learner!"
    print("  [PASS] Learner questions confirmed safe (no correct_answer / explanation leakage)")

    # Retrieve quiz
    r_get_q = requests.get(f"{BASE}/api/assessment/quizzes/{quiz_id}")
    assert r_get_q.status_code == 200
    print(f"  [PASS] Retrieved quiz {quiz_id} -> 200")

    # Submit quiz
    submit_payload = {
        "answers": [{"question_id": q["question_id"], "selected_answer": "A"} for q in questions]
    }
    r_sub = requests.post(f"{BASE}/api/assessment/quizzes/{quiz_id}/submit", json=submit_payload)
    assert r_sub.status_code == 200, f"Submit failed: {r_sub.status_code} {r_sub.text}"
    result_data = r_sub.json()
    print(f"  [PASS] Submitted quiz {quiz_id} -> score: {result_data['score']}/{result_data['total_questions']} ({result_data['percentage']}%)")

    # Retrieve result
    r_res = requests.get(f"{BASE}/api/assessment/quizzes/{quiz_id}/result")
    assert r_res.status_code == 200
    print(f"  [PASS] Retrieved quiz result -> 200")

    # Verify duplicate submission is blocked
    r_dup = requests.post(f"{BASE}/api/assessment/quizzes/{quiz_id}/submit", json=submit_payload)
    assert r_dup.status_code == 400, f"Expected 400 for duplicate submission, got {r_dup.status_code}"
    print(f"  [PASS] Duplicate submission rejected with 400 Bad Request")

    # Verify learner progress updated
    r_prog = requests.get(f"{BASE}/api/learners/U001/progress")
    assert r_prog.status_code == 200
    prog_data = r_prog.json()
    assert prog_data["total_tracked_topics"] >= 1
    print(f"  [PASS] Learner progress updated -> {prog_data['total_tracked_topics']} topic(s) tracked, overall accuracy: {prog_data['overall_accuracy']}%")

    # Verify personalized recommendation
    r_rec = requests.get(f"{BASE}/api/learners/U001/recommendation")
    assert r_rec.status_code == 200
    print(f"  [PASS] Personalized recommendation -> 200 (priority topic: {r_rec.json().get('target_topic')})")

    # Verify adaptive practice
    r_adapt = requests.post(f"{BASE}/api/assessment/quizzes/{quiz_id}/adaptive-practice", json={"count": 2})
    assert r_adapt.status_code == 201, f"Adaptive practice failed: {r_adapt.status_code} {r_adapt.text}"
    print(f"  [PASS] Adaptive practice created -> 201 (quiz_id: {r_adapt.json()['quiz_id']})")

    print("\n=== 3. Trainer Question Bank Lifecycle ===")
    # List question bank items
    r_qb = requests.get(f"{BASE}/api/assessment/question-bank")
    assert r_qb.status_code == 200
    print(f"  [PASS] GET /api/assessment/question-bank -> 200 (total: {r_qb.json()['total']})")

    # Create question bank item
    qb_item_payload = {
        "question": "What is the standard base year currently used for Indian GDP compilation?",
        "options": [
            {"id": "A", "text": "2004-05"},
            {"id": "B", "text": "2011-12"},
            {"id": "C", "text": "2016-17"},
            {"id": "D", "text": "2020-21"}
        ],
        "correct_answer": "B",
        "explanation": "The Ministry of Statistics and Programme Implementation uses 2011-12 as the base year for GDP series.",
        "difficulty": "easy",
        "topic": "National Accounts & GDP",
        "source": {
            "document_id": "doc_nss_78th",
            "document": "NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            "chunk_ids": ["chunk_001"],
            "locations": ["Page 1"]
        },
        "origin": "MANUAL"
    }
    r_create_qb = requests.post(f"{BASE}/api/assessment/question-bank", json=qb_item_payload)
    assert r_create_qb.status_code == 201, f"Create question bank item failed: {r_create_qb.status_code} {r_create_qb.text}"
    created_qid = r_create_qb.json()["question_id"]
    print(f"  [PASS] Created question bank item: {created_qid} (status: {r_create_qb.json()['status']})")

    # Approve question
    r_app = requests.post(f"{BASE}/api/assessment/question-bank/{created_qid}/approve")
    assert r_app.status_code == 200, f"Approve failed: {r_app.status_code}"
    assert r_app.json()["status"] == "APPROVED"
    print(f"  [PASS] Approved question {created_qid} -> status: APPROVED")

    # Assemble quiz from bank
    from_bank_payload = {
        "count": 1,
        "topic": "National Accounts & GDP",
        "learner_id": "U001"
    }
    r_from_bank = requests.post(f"{BASE}/api/assessment/quizzes/from-bank", json=from_bank_payload)
    assert r_from_bank.status_code == 201, f"Quiz from bank failed: {r_from_bank.status_code} {r_from_bank.text}"
    bank_quiz = r_from_bank.json()
    print(f"  [PASS] Assembled quiz from bank: {bank_quiz['quiz_id']} with {len(bank_quiz['questions'])} question(s)")

    print("\n=======================================================")
    print("ALL LIVE HTTP ENDPOINTS AND WORKFLOWS VALIDATED!")
    print("=======================================================")

if __name__ == "__main__":
    main()
