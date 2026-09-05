# STEP 7B-2 — SUPABASE PERSISTENCE MIGRATION

**Project:** StatSaksham AI — SIH26101  
**Scope:** P3 Learner Progress, Quiz Sessions, and Trainer Question Bank Migration to Supabase PostgreSQL  
**Status:** ✅ COMPLETED & FULLY VALIDATED  

---

## 1. Executive Summary

In Step 7B-2, we migrated the three core structured P3 application-state domains from local JSON file repositories to live Supabase PostgreSQL tables:

1. **Learner Progress (`learner_progress`)**:
   - Long-term topic mastery, attempt counts, recent accuracy, trend evaluation, and history snapshots.
2. **Quiz Sessions (`quiz_sessions`)**:
   - Assessment snapshots, questions served, learner answers, evaluation results, topic performance, and anti-duplicate submission enforcement.
3. **Trainer Question Bank (`question_bank`)**:
   - Trainer curation repository supporting question generation, manual drafting, trainer review, status transition (`DRAFT` → `APPROVED` / `REJECTED`), and quiz assembly from approved items.

All existing API endpoints, Pydantic validation models, learner-safe response guarantees, and RAG/FAISS pipelines remain 100% intact and unchanged.

---

## 2. Supabase Schemas Created

All tables and indices were created idempotently via `backend/integrations/migrate_7b2.py` reusing P1's bound SQLAlchemy engine.

### A. `learner_progress`
```sql
CREATE TABLE IF NOT EXISTS learner_progress (
    learner_id              VARCHAR(50) PRIMARY KEY,
    canonical_user_id       UUID,
    total_tracked_topics    INTEGER DEFAULT 0,
    mastered_topics         INTEGER DEFAULT 0,
    topics_needing_review   INTEGER DEFAULT 0,
    improving_topics        INTEGER DEFAULT 0,
    overall_accuracy        NUMERIC(5, 2) DEFAULT 0.0,
    topics                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_canonical ON learner_progress (canonical_user_id);
```

### B. `quiz_sessions`
```sql
CREATE TABLE IF NOT EXISTS quiz_sessions (
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

CREATE INDEX IF NOT EXISTS idx_qs_learner ON quiz_sessions (learner_id);
CREATE INDEX IF NOT EXISTS idx_qs_status ON quiz_sessions (status);
CREATE INDEX IF NOT EXISTS idx_qs_canonical ON quiz_sessions (canonical_user_id);
```

### C. `question_bank`
```sql
CREATE TABLE IF NOT EXISTS question_bank (
    question_id             VARCHAR(100) PRIMARY KEY,
    question                TEXT NOT NULL,
    options                 JSONB NOT NULL,
    correct_answer          VARCHAR(10) NOT NULL,
    explanation             TEXT,
    difficulty              VARCHAR(20) DEFAULT 'medium',
    topic                   VARCHAR(100) DEFAULT 'General',
    document_id             VARCHAR(100),
    source                  JSONB NOT NULL,
    status                  VARCHAR(20) DEFAULT 'DRAFT',
    origin                  VARCHAR(20) DEFAULT 'GENERATED',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at             TIMESTAMPTZ,
    reviewed_by             VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_qb_status ON question_bank (status);
CREATE INDEX IF NOT EXISTS idx_qb_topic ON question_bank (topic);
CREATE INDEX IF NOT EXISTS idx_qb_document_id ON question_bank (document_id);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank (difficulty);
```

---

## 3. Data Migrated

| Domain | Source Location | Target Table | Records Migrated | Status |
|---|---|---|---|---|
| Question Bank | `backend/data/question_bank/*.json` | `question_bank` | 2 (`qb_45259ecede`, `qb_a268ceed27`) | Migrated & Verified |
| Learner Progress | `backend/data/learner_progress/*.json` | `learner_progress` | 0 (directory had no static files) | Migrated & Live Populated |
| Quiz Sessions | `backend/data/quizzes/*.json` | `quiz_sessions` | 0 (directory had no static files) | Migrated & Live Populated |

---

## 4. Repository & Service Architecture

The service layer was updated to follow a **write-through, Supabase-primary** design:

1. **`LearnerProgressRepository`**:
   - `get_progress(learner_id)`: Queries Supabase first. Populates memory cache on cache miss. Falls back to local JSON file if Supabase is unreachable.
   - `save_progress(profile)`: Writes to Supabase (`upsert_learner_progress`) with canonical user ID resolved via `IdentityMappingService`. Updates local JSON file as fallback mirror.
2. **`QuizRepository`**:
   - `save_quiz(session)`: Persists quiz question snapshot, status, score, submission, and result JSONB payload to Supabase.
   - `get_quiz(quiz_id)`: Loads complete session from Supabase, restoring timestamp datetimes into ISO strings.
   - `update_quiz(session)`: Re-upserts updated session upon submission.
3. **`QuestionBankRepository`**:
   - `_load_all()`: Fetches all questions from Supabase at initialization.
   - `save(item)`: Upserts question with review state, status, and source provenance into Supabase and updates cache.
   - `get(question_id)`: Reads from cache / Supabase.
   - `list(...)`: Filters in-memory synchronized cache.

---

## 5. Security & Safety Validations

1. **Zero Answer Leakage to Learners**:
   - Learner-facing endpoint `GET /api/assessment/quizzes/{quiz_id}` serves questions through `LearnerQuestion`, which strips `correct_answer` and `explanation`.
   - Verified that `correct_answer` and `explanation` are never present in client responses prior to submission.
2. **Question Bank Approval Guardrail**:
   - Only questions with `status == "APPROVED"` are returned when assembling quizzes via `POST /api/assessment/quizzes/from-bank`. `DRAFT` and `REJECTED` items are filtered out.
3. **Idempotence & Duplicate Submission**:
   - Submitting an already `SUBMITTED` quiz rejects immediately with `400 Bad Request` ("Quiz has already been submitted and cannot be re-evaluated").
4. **Credential Safety**:
   - Reuses existing environment variables and connection pool. Zero credentials hardcoded or committed to git.

---

## 6. Restart Persistence Test Results

Executed via [`backend/tests/test_persistence_7b2.py`](file:///c:/Users/vishr/Downloads/sih/backend/tests/test_persistence_7b2.py):

```text
=================================================================
STATSAKSHAM AI — STEP 7B-2 RESTART PERSISTENCE VERIFICATION
=================================================================
>>> Step 7B-2 / Check 1: Verifying Supabase tables exist...
    [PASS] Tables 'learner_progress', 'quiz_sessions', and 'question_bank' exist in Supabase.

>>> Step 7B-2 / Test A: Learner Progress Persistence & Restart...
    Saving progress (write-through to Supabase)...
    [PASS] Progress confirmed in Supabase database row.
    Simulating server restart (wiping in-memory cache)...
    [PASS] Learner progress, topic metrics, and history fully restored after restart!

>>> Step 7B-2 / Test B: Quiz Session Lifecycle, Submission & Restart...
    [PASS] Learner-safe question representation verified (zero answer leakage).
    Submitting quiz and persisting result to Supabase...
    [PASS] Quiz evaluation result confirmed in Supabase.
    Simulating server restart (wiping in-memory cache)...
    [PASS] Quiz session and evaluation result restored from Supabase after restart!
    Testing duplicate submission prevention...
    [PASS] Duplicate submission correctly blocked by session status guard.

>>> Step 7B-2 / Test C: Trainer Question Bank Persistence & Approval Workflow...
    Saving DRAFT question to Question Bank (Supabase write)...
    [PASS] DRAFT question correctly hidden from approved learner-facing selection.
    Transitioning question status to APPROVED...
    [PASS] Approved question status confirmed in Supabase row.
    Simulating server restart (wiping in-memory cache)...
    [PASS] Question status and review metadata persisted through restart!
    [PASS] Approved question now actively selectable for quiz assembly.
    Cleaned up test question from Supabase.

=================================================================
ALL STEP 7B-2 PERSISTENCE TESTS PASSED!
=================================================================
```

---

## 7. Verification Baseline (Zero Regressions)

- **Master Regression Suite (`run_all_tests.py`)**:
  - Unified Smoke Tests: **13 / 13 PASSED**
  - Cross-Module Integration Tests: **10 / 10 PASSED**
  - P1 Competency Intelligence Tests: **8 / 8 PASSED**
  - P4 Workforce & Analytics Tests: **12 / 12 PASSED**
  - Total: **43 / 43 PASSED**
- **Frontend Validation**:
  - TypeScript (`npx tsc --noEmit`): **0 errors**
  - Production Build (`npm run build`): **PASS**
  - Oxlint (`npx oxlint`): **0 errors**
- **Live HTTP Server**:
  - `GET /api/health` -> 200 OK
  - `GET /api/documents` -> 200 OK (27 documents)
  - `GET /api/v1/competencies` -> 200 OK
  - `GET /api/v1/integration/learner-flow/2b574d66-f752-4348-ab00-17587012f291` -> 200 OK
  - End-to-end learner quiz, submit, progress update, adaptive practice, and trainer question bank workflow -> 100% verified.

---

## 8. Current Persistence State Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                   StatSaksham AI Backend                  │
└───────────────┬──────────────────────────┬───────────────┘
                │                          │
      ┌─────────▼─────────┐      ┌─────────▼─────────┐
      │     Supabase      │      │    Local Files    │
      │    PostgreSQL     │      │     & Vectors     │
      └─────────┬─────────┘      └─────────┬─────────┘
                │                          │
  ┌─────────────┼─────────────┐            ├── FAISS Index
  │             │             │            │   (learning_materials.faiss)
  ├─ officials  ├─ documents  ├─ question_ │
  │  & comps    │  metadata   │  bank      ├── Raw Uploads
  │  (P1)       │  (P3)       │  (P3)      │   (data/uploads)
  │             │             │            │
  ├─ identity_  ├─ learner_   ├─ quiz_     └── Chunks & Embeddings
  │  mapping    │  progress   │  sessions      JSON Cache
  │  (Platform) │  (P3)       │  (P3)
  └─────────────┴─────────────┴────────────┘
                │
      ┌─────────▼─────────┐
      │     P4 SQLite     │  <- (Workforce prototype persistence)
      └───────────────────┘
```

---

## 9. Known Limitations

1. **P4 SQLite Persistence**:
   - P4 workforce analytics, cadre allocations, and quest state continue to reside in local `data/statsaksham.db` (SQLite). Migration of P4 is intentionally deferred to Step 7B-3.
2. **Vector Index (FAISS)**:
   - Chunk embeddings remain indexed in FAISS files (`data/vector_store/learning_materials.faiss`). Supabase `pgvector` migration is a potential future enhancement.
3. **iGOT Catalog**:
   - Remains a mock adapter with standard MoSPI-aligned course listings.
