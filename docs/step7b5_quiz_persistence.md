# STEP 7B-5 — P3 QUIZ PERSISTENCE AUDIT & VERIFICATION REPORT

**Project:** StatSaksham AI (SIH26101)  
**Date:** 2026-09-06  
**Scope:** Audit, verify, and validate durable P3 quiz session and evaluation result persistence in Supabase PostgreSQL.

---

## 1. AUDIT FINDINGS

A thorough read-only audit of the codebase, Supabase database, and filesystem was conducted:
* **Database Table:** Supabase PostgreSQL already contains the `public.quiz_sessions` table created during Step 7B-2.
* **Storage Alignment:** All 9 quiz sessions existing on disk (`backend/data/quizzes/*.json`) were verified to already exist in Supabase with exact matching fields (`status`, `score`, `percentage`, `questions_snapshot`, `submission`, `result`).
* **Repository Architecture:** `QuizRepository` (`backend/modules/learning/services/quiz_repository.py`) already uses Supabase as its primary store:
  - `save_quiz()` and `update_quiz()` invoke `upsert_quiz_session()`.
  - `get_quiz()` reads through in-memory cache, then queries Supabase via `get_quiz_session_row()`, with local JSON disk serving strictly as fallback.
* **Identity Handling:** Every quiz session in Supabase is explicitly stamped with `canonical_user_id` (`2b574d66-f752-4348-ab00-17587012f291` for learner `U001`).

---

## 2. DECISION GATE & MIGRATION NECESSITY

**Decision:** **PATH A — ALREADY CORRECT**

> "No schema migration was required because the existing implementation already provides durable Supabase quiz persistence."

All quiz sessions, snapshots, and results are already durably persisted in Supabase with zero data loss, full restart resilience, and canonical user resolution.

---

## 3. STORAGE ARCHITECTURE

### Previous Architecture:
Historically, quiz sessions were saved as JSON files in `backend/data/quizzes/{quiz_id}.json`.

### Validated Supabase Architecture:
```text
Learner / UI
     ↓
POST /api/assessment/quizzes
     ↓
QuizRepository.save_quiz()
     ↓
SUPABASE (public.quiz_sessions)
     ↓
Learner Answers & Submission
     ↓
POST /api/assessment/quizzes/{quiz_id}/submit
     ↓
QuizEvaluator.evaluate()
     ↓
QuizRepository.update_quiz() -> SUPABASE
     ↓
LearnerProgressService.update_from_quiz_result() -> SUPABASE (public.learner_progress)
     ↓
WorkflowService.on_quiz_submitted() -> AssessmentResultContract -> P1 / P4
```

---

## 4. SUPABASE TABLE SCHEMA

The `public.quiz_sessions` table provides full relational and JSONB persistence for quiz sessions:

```sql
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    quiz_id                 VARCHAR(100) PRIMARY KEY,
    learner_id              VARCHAR(50) NOT NULL,
    canonical_user_id       UUID,
    document_id             VARCHAR(100) NOT NULL,
    topic                   TEXT,
    difficulty              VARCHAR(30) DEFAULT 'medium',
    status                  VARCHAR(30) DEFAULT 'IN_PROGRESS',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    submitted_at            TIMESTAMPTZ,
    score                   INTEGER,
    percentage              NUMERIC(5, 2),
    parent_quiz_id          VARCHAR(100),
    adaptive_round          INTEGER DEFAULT 0,
    adaptive_target_topic   TEXT,
    questions_snapshot      JSONB NOT NULL DEFAULT '[]'::jsonb,
    submission              JSONB,
    result                  JSONB,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qs_learner ON public.quiz_sessions (learner_id);
CREATE INDEX IF NOT EXISTS idx_qs_status ON public.quiz_sessions (status);
CREATE INDEX IF NOT EXISTS idx_qs_canonical ON public.quiz_sessions (canonical_user_id);
```

---

## 5. SOURCE-OF-TRUTH DECISION

* **Primary Store:** Supabase PostgreSQL (`public.quiz_sessions`).
* **Fallback / Backup:** Local JSON files (`backend/data/quizzes/*.json`) act only as a backup copy and offline fallback.
* **Consistency:** All writes update Supabase first. In-memory cache is ephemeral and repopulated from Supabase.

---

## 6. CANONICAL IDENTITY

* The identity service resolves local identifiers (`U001`) to the canonical UUID:
  `2b574d66-f752-4348-ab00-17587012f291`
* All records in `public.quiz_sessions` carry this UUID in `canonical_user_id`.
* P1 and P4 workflows receive the identical UUID via `AssessmentResultContract`.

---

## 7. QUESTION SNAPSHOT & ANTI-LEAKAGE BEHAVIOR

* **Immutable Snapshot:** The server-side session stores the exact questions generated in `questions_snapshot`.
* **Zero Answer Leakage:**
  - `GET /api/assessment/quizzes/{quiz_id}` transforms questions into `LearnerQuestion` objects.
  - Correct answers (`correct_answer`) and explanations (`explanation`) are strictly stripped before reaching the client.
* **Deterministic Evaluation:** On submission, `QuizEvaluator` compares learner answers strictly against the stored server snapshot.

---

## 8. SUBMISSION IDEMPOTENCY

* When a quiz is submitted, its status transitions from `IN_PROGRESS` to `SUBMITTED`.
* Subsequent attempts to submit to the same `quiz_id` are rejected immediately:
  `HTTP 400 Bad Request: Quiz '{quiz_id}' has already been submitted and cannot be re-evaluated.`
* Prevents accidental duplicate scoring, duplicate attempts in learner progress, and repeated XP awards in P4.

---

## 9. RESTART PERSISTENCE TEST

Verified in test suite `test_persistence_7b5.py` and via live uvicorn server restart:
1. Created quiz session `quiz_ca82139fcf` via `POST /api/assessment/quizzes`.
2. Submitted answers via `POST /api/assessment/quizzes/quiz_ca82139fcf/submit` (Score: 1/2, 50.0%).
3. Completely stopped and killed the running backend daemon.
4. Restarted backend server process.
5. Retrieved `GET /api/assessment/quizzes/quiz_ca82139fcf` -> HTTP 200 OK (`status: SUBMITTED`).
6. Retrieved `GET /api/assessment/quizzes/quiz_ca82139fcf/result` -> HTTP 200 OK (`score: 1, percentage: 50.0%`).
7. **Result: PASS.**

---

## 10. QUIZ → PROGRESS INTEGRATION

Submission of `quiz_ca82139fcf` automatically triggered:
1. Progress update in `public.learner_progress` (Supabase) for topic `Survey Methodology` (Attempts: 1, Accuracy: 50.0%, Mastery: 3.00, State: `LEARNING`).
2. Emitted `AssessmentResultContract` through `WorkflowService.on_quiz_submitted()`.
3. Updated cross-module learner flow without errors.

---

## 11. REGRESSION & TEST RESULTS

### Backend Tests
* **Backend Master Regression:** 43 / 43 PASS (100%)
* **Cross-Module Integration:** 10 / 10 PASS
* **Unified Smoke:** 13 / 13 PASS
* **P1 Competency Intelligence:** 8 / 8 PASS
* **P4 Workforce & Analytics:** 12 / 12 PASS
* **Step 7B-1 (Identity & Documents):** 3 / 3 PASS
* **Step 7B-2 (Learning Persistence):** 3 / 3 PASS
* **Step 7B-3 (P4 Workforce):** 5 / 5 PASS
* **Step 7B-4 (Learner Progress):** 4 / 4 PASS
* **Step 7B-5 (Quiz Sessions Persistence):** 4 / 4 PASS

### Frontend Checks
* **TypeScript:** 0 errors (`npx tsc --noEmit`)
* **Vite Build:** PASS (`npm run build` in 934ms)
* **Oxlint:** 0 errors (10 non-blocking hook warnings)

### Live HTTP Endpoint Health
* `/health` -> 200 OK
* `/api/health` -> 200 OK
* `/api/assessment/quizzes/{quiz_id}` -> 200 OK
* `/api/assessment/quizzes/{quiz_id}/result` -> 200 OK
* `/api/learners/U001/progress` -> 200 OK
* `/api/v1/learner/progress` -> 200 OK
* `/api/v1/learner/competency-improvements` -> 200 OK
* `/api/v1/integration/learner-flow/2b574d66-f752-4348-ab00-17587012f291` -> 200 OK

---

## 12. REMAINING LIMITATIONS

* Vector search remains on local FAISS (`backend/data/vector_store/index.faiss`).
* iGOT recommendations continue using the mock adapter.
* Trainer Question Bank maintains Supabase persistence with local JSON compatibility fallbacks.
