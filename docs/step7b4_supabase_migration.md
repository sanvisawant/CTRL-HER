# STEP 7B-4 — P3 LEARNER PROGRESS MIGRATION REPORT

**Project:** StatSaksham AI (SIH26101)  
**Date:** 2026-09-06  
**Scope:** Migration of durable P3 learner progress & mastery persistence from local JSON storage to Supabase PostgreSQL.

---

## 1. PREVIOUS JSON ARCHITECTURE

Prior to Step 7B-4, learner progress was stored as individual JSON files on disk under:
`backend/data/learner_progress/{learner_id}.json`

### Characteristics of Legacy JSON Storage:
* Each file stored an aggregate profile:
  ```json
  {
    "learner_id": "U001",
    "topics": {
      "Sampling Design": {
        "topic": "Sampling Design",
        "attempts": 3,
        "questions_attempted": 15,
        "correct_answers": 5,
        "incorrect_answers": 10,
        "accuracy": 33.33,
        "recent_accuracy": 40.0,
        "mastery_score": 2.1,
        "mastery_state": "NEEDS_REVIEW",
        "trend": "DECLINING",
        "history": [...]
      }
    }
  }
  ```
* **Limitations:**
  - Filesystem-bound; concurrent updates risk file locking or race conditions.
  - Not directly queryable via relational analytics or cross-module SQL joins.
  - Lacked foreign keys or canonical UUID linking with P1/P4.

---

## 2. NEW SUPABASE ARCHITECTURE

Supabase PostgreSQL is now the **primary source of truth** for durable learner progress.

### Architectural Flow:
```text
P1 Competency Intelligence
        ↓
P2 Recommendation (iGOT & Learning Paths)
        ↓
P3 Learning & Quiz Assessment Engine
        ↓
Learner Progress Service / Repository
        ↓
SUPABASE (public.learner_progress)
        ↓
P1 / P4 / P5 Unified Real-Time Consumers
```

### Key Highlights:
1. Every topic progress record is stored as an individual row in `public.learner_progress`.
2. Each row is tied to the **canonical learner identity** (`canonical_user_id` UUID) as well as the local `learner_id` (`U001`).
3. Updates use PostgreSQL `ON CONFLICT (learner_id, topic) DO UPDATE` (upsert), ensuring idempotency and atomic writes.
4. Reads seamlessly assemble individual topic rows into the `LearnerProgressProfile` structure consumed by P3 APIs and cross-module workflows.

---

## 3. TABLE SCHEMA & INDEXING

The `public.learner_progress` table has been migrated and verified in Supabase PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS public.learner_progress (
    id VARCHAR(120) PRIMARY KEY,
    canonical_user_id UUID,
    learner_id VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    competency_id INTEGER,
    competency_name VARCHAR(150),
    attempts INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    accuracy DOUBLE PRECISION DEFAULT 0.0,
    recent_accuracy DOUBLE PRECISION DEFAULT 0.0,
    mastery_score DOUBLE PRECISION DEFAULT 1.0,
    mastery_state VARCHAR(50) DEFAULT 'NEEDS_REVIEW',
    trend VARCHAR(50) DEFAULT 'INSUFFICIENT_DATA',
    first_attempt_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    history JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_learner_progress_lid_topic UNIQUE (learner_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_lp_canonical_uid ON public.learner_progress(canonical_user_id);
CREATE INDEX IF NOT EXISTS idx_lp_learner_id ON public.learner_progress(learner_id);
CREATE INDEX IF NOT EXISTS idx_lp_topic ON public.learner_progress(topic);
CREATE INDEX IF NOT EXISTS idx_lp_mastery_state ON public.learner_progress(mastery_state);
```

### Deterministic Natural Key:
- `(learner_id, topic)` uniquely identifies a learner's mastery profile for a given topic.
- `id` format: `lp_{canonical_uid[:8]}_{slugified_topic}` (e.g., `lp_2b574d66_sampling_design`).

---

## 4. MIGRATION BEHAVIOR

The deterministic migration script `backend/integrations/migrate_7b4.py` reads all existing JSON records from `backend/data/learner_progress/`, resolves canonical identities via `identity_service`, and upserts them into `public.learner_progress`.

### Verification & Idempotency:
* **Initial JSON Topics (`U001.json`):** 3 topics
  1. `Sampling Design` (attempts: 3, accuracy: 33.33%, mastery: 2.1, state: `NEEDS_REVIEW`)
  2. `Sampling Stratification` (attempts: 2, accuracy: 88.89%, mastery: 4.2, state: `MASTERED`)
  3. `Index Number Methodology` (attempts: 1, accuracy: 83.33%, mastery: 3.8, state: `IMPROVING`)
* **Supabase Rows Migrated:** 3 rows
* **Idempotency:** Re-running migration produces 0 duplicates due to the `ON CONFLICT (learner_id, topic)` constraint.
* **Backup Preservation:** The source file `backend/data/learner_progress/U001.json` is preserved as a local backup and migration archive.

---

## 5. SOURCE-OF-TRUTH DECISION

* **Supabase = Primary Source of Truth.**
  - `LearnerProgressRepository.get_progress()` queries `public.learner_progress` via Supabase persistence layer first.
  - `LearnerProgressRepository.save_progress()` writes directly to `public.learner_progress`.
* **JSON Files = Secondary / Migration Compatibility Only.**
  - Local JSON is only accessed as an emergency fallback if Supabase is offline.
  - No dual diverging state is maintained.

---

## 6. CANONICAL IDENTITY HANDLING

The canonical identity mapping established in Step 7B-1 is strictly honored:
* Demo learner: `U001` (P2/P3) ↔ `usr_demo_001` (P4) ↔ `ISS-2024-8921` (P5) ↔ `2b574d66-f752-4348-ab00-17587012f291` (Canonical UUID).
* When learner progress is saved, `identity_service.resolve(learner_id)` attaches `canonical_user_id` to each record in Supabase.
* Cross-module endpoints (`/api/v1/integration/learner-flow/{uuid}`) resolve seamlessly using this identity.

---

## 7. FALLBACK BEHAVIOR

If Supabase is unreachable (e.g. network interruption):
1. `LearnerProgressRepository` falls back to the local JSON filesystem gracefully without crashing the server.
2. In-memory profile caching (`_cache`) satisfies subsequent reads within the process lifecycle.
3. Fallback occurrences are clearly logged at `WARNING` level with error context.

---

## 8. RESTART PERSISTENCE TEST

A dedicated test (`test_03_restart_persistence` in `backend/tests/test_persistence_7b4.py`) simulates a full server restart:
1. Clears in-memory caches on `LearnerProgressRepository`.
2. Creates an entirely fresh instance of `LearnerProgressRepository`.
3. Queries learner `U001` from Supabase.
4. Verifies that all topics, attempt counts, mastery scores, and accuracy percentages match the persisted state.
5. **Result: PASS (State survives memory wipe & process reload).**

---

## 9. QUIZ → PROGRESS INTEGRATION TEST

`test_02_quiz_to_progress_integration_and_persistence` in `backend/tests/test_persistence_7b4.py` validates the complete workflow:
1. Creates a 3-question quiz session for `U001` on topic `Sampling Variance Estimation`.
2. Submits answers and evaluates results via `QuizEvaluator`.
3. Verifies `AssessmentResultContract` and `MasteryUpdateContract` emission.
4. Updates progress via `LearnerProgressRepository.record_quiz_result()`.
5. Verifies that the new topic row appears in Supabase `learner_progress` table with correct attempt counts and accuracy (100.0%).
6. **Result: PASS.**

---

## 10. TEST RESULTS SUMMARY

### Backend Regressions
* **Unified Smoke Tests:** 13 / 13 PASS
* **Cross-Module Integration Tests:** 10 / 10 PASS
* **P1 Competency Intelligence Tests:** 8 / 8 PASS
* **P4 Workforce & Analytics Tests:** 12 / 12 PASS
* **Total Master Backend Regression:** 43 / 43 PASS (100%)

### Persistence Migration Suites
* **Step 7B-1 (Identity & Documents):** 3 / 3 PASS
* **Step 7B-2 (Learning Persistence):** 3 / 3 PASS
* **Step 7B-3 (P4 Workforce Supabase):** 5 / 5 PASS
* **Step 7B-4 (Learner Progress Supabase):** 4 / 4 PASS

### Frontend Quality Checks
* **TypeScript (`npx tsc --noEmit`):** 0 errors
* **Vite Build (`npm run build`):** PASS (648ms, clean bundle)
* **Oxlint (`npx oxlint`):** 0 errors (10 warnings, all in non-blocking UI hooks)

### Live Runtime HTTP Checks
* `GET /health` -> HTTP 200 OK
* `GET /api/health` -> HTTP 200 OK
* `GET /api/learners/U001/progress` -> HTTP 200 OK (returns Supabase progress)
* `GET /api/v1/learner/progress` -> HTTP 200 OK
* `GET /api/v1/learner/competency-improvements` -> HTTP 200 OK
* `GET /api/v1/integration/learner-flow/2b574d66-f752-4348-ab00-17587012f291` -> HTTP 200 OK

---

## 11. REMAINING LIMITATIONS

1. **Local FAISS Vector Index:** Semantic document search remains in local FAISS (`backend/data/vector_store/index.faiss`); migration to pgvector is not part of this step.
2. **iGOT Mock Adapter:** iGOT course recommendations continue to use the mock service adapter pending live government API credentials.
3. **Question Bank & Sessions:** Stored in Supabase per Step 7B-2 with JSON compatibility fallback.
