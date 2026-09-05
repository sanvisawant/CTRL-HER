# STEP 7B-6 — P3 TRAINER QUESTION BANK PERSISTENCE AUDIT & VERIFICATION REPORT

**Project:** StatSaksham AI (SIH26101)  
**Date:** 2026-09-06  
**Scope:** Audit, verify, and validate durable P3 Trainer Question Bank persistence in Supabase PostgreSQL.

---

## 1. AUDIT FINDINGS

A comprehensive read-only audit of the Trainer Question Bank was conducted across the codebase, Supabase database, and filesystem:
* **Supabase Table:** Table `public.question_bank` was verified to already exist in Supabase (created in Step 7B-2) with full schema support for options, source provenance, review lifecycle, and indexes.
* **Storage Alignment:** All 3 active records on disk (`backend/data/question_bank/*.json`) match Supabase rows 1-to-1 with identical question IDs, content, source provenance, difficulty, and review statuses (`qb_45259ecede` [APPROVED], `qb_95d55c5ae7` [APPROVED], and `qb_a268ceed27` [REJECTED]).
* **Repository Implementation:** `QuestionBankRepository` (`backend/modules/learning/services/question_bank_repository.py`) uses Supabase as its primary store (`upsert_question_bank_item`, `get_question_bank_item_row`, `list_question_bank_rows`), reading from Supabase on startup and using disk strictly as an offline fallback.
* **Review Lifecycle:** The DRAFT -> REVIEW -> APPROVED / REJECTED lifecycle is strictly enforced by the server API and repository.
* **Learner Protection:** Unapproved questions (`DRAFT` and `REJECTED`) are strictly inaccessible to learners. Assembling a quiz from the question bank (`/quizzes/from-bank`) strictly enforces `status='APPROVED'`.

---

## 2. DECISION GATE & MIGRATION NECESSITY

**Decision:** **PATH A — ALREADY CORRECT**

> "No schema migration was required because the existing implementation already provides durable Supabase Question Bank persistence."

No new tables or data migrations were required. All records were already accurately persisted in Supabase with complete grounded provenance and review metadata.

---

## 3. STORAGE ARCHITECTURE

### Architecture Flow:
```text
AI Question Generation / Manual Entry
        ↓
POST /api/assessment/question-bank
        ↓
DRAFT in Supabase (public.question_bank)
        ↓
Trainer Review & Editorial
        ↓
POST /api/assessment/question-bank/{qid}/approve (or /reject)
        ↓
APPROVED / REJECTED in Supabase (public.question_bank)
        ↓
Learner Quiz Assembly (POST /api/assessment/quizzes/from-bank)
        ↓
Filters strictly status='APPROVED'
        ↓
Generates Quiz Session & Learner-Safe Question Snapshot (Zero Answer Leakage)
        ↓
Supabase (public.quiz_sessions)
```

---

## 4. SUPABASE TABLE SCHEMA

The `public.question_bank` table schema in Supabase PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS public.question_bank (
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

CREATE INDEX IF NOT EXISTS idx_qb_status ON public.question_bank (status);
CREATE INDEX IF NOT EXISTS idx_qb_topic ON public.question_bank (topic);
CREATE INDEX IF NOT EXISTS idx_qb_document_id ON public.question_bank (document_id);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON public.question_bank (difficulty);
```

---

## 5. SOURCE-OF-TRUTH DECISION

* **Primary Store:** Supabase PostgreSQL (`public.question_bank`).
* **Fallback / Mirror:** Local JSON files (`backend/data/question_bank/*.json`) exist solely as an emergency offline cache and local migration mirror.
* **Write Semantics:** Writes and status transitions execute against Supabase first with `ON CONFLICT (question_id) DO UPDATE`.
* **Read Semantics:** Repository startup loads all active items from Supabase. In-memory cache handles sub-millisecond retrieval.

---

## 6. QUESTION LIFECYCLE & APPROVAL ENFORCEMENT

1. **DRAFT:** New questions created via `POST /api/assessment/question-bank` default to `status="DRAFT"`.
2. **APPROVED:** A trainer reviews and submits `POST /api/assessment/question-bank/{qid}/approve`. Validates question structure, sets `status="APPROVED"`, and records `reviewed_at` and `reviewed_by`.
3. **REJECTED:** A trainer rejects flawed or redundant questions via `POST /api/assessment/question-bank/{qid}/reject`. Sets `status="REJECTED"`, preserving the item for audit and duplicate prevention.
4. **Enforcement:** `POST /api/assessment/quizzes/from-bank` queries questions with `status="APPROVED"`. DRAFT or REJECTED items can never enter learner quizzes.

---

## 7. LEARNER SAFETY & LEAKAGE PREVENTION

* **Stripped Fields:** When an approved question bank item is selected for a learner quiz, it is transformed into `LearnerQuestion`.
* **Anti-Leakage Guarantee:** `correct_answer` and `explanation` are strictly removed before the response payload is returned to the learner.
* **Integrity:** The server-side session snapshot (`QuizSession.questions_snapshot`) retains full answers and explanations for deterministic post-submission evaluation.

---

## 8. QUESTION PROVENANCE

Every question in the question bank maintains complete grounded lineage to official MoSPI documentation:
* `source.document_id`: Unique document reference (e.g., `doc_nss_78th`, `doc_cpi_manual`).
* `source.document`: Official filename (e.g., `NSS_78th_Round_Multiple_Indicator_Survey.pdf`).
* `source.chunk_ids`: Verified chunk citations.
* `source.locations`: Human-readable location references (e.g., `Page 3`, `Chapter 2`).
Provenance remains strictly immutable during trainer editing.

---

## 9. RESTART PERSISTENCE & IDEMPOTENCY

* **Restart Resilience:** Wiping repository cache in memory (`repo._cache.clear()`) and reloading from Supabase demonstrates 100% preservation of all fields, including `question_id`, `status`, `options`, `source`, and reviewer metadata.
* **Idempotency:** Repeatedly saving a question with the same `question_id` executes an upsert, modifying the existing row without creating duplicates.
* **Duplicate Detection:** `repo.find_duplicate()` checks normalized question text, document ID, and topic to reject identical questions at creation time (`HTTP 409 Conflict`).

---

## 10. QUESTION BANK → QUIZ INTEGRATION

Verified through live HTTP endpoints:
1. `GET /api/assessment/question-bank` retrieves active questions.
2. `POST /api/assessment/quizzes/from-bank` with `{ count: 1, topic: 'Sampling Units' }` selects the approved item `qb_45259ecede`.
3. Creates a new quiz session `quiz_2076942582` in Supabase with learner-safe questions.
4. Returns HTTP 201 Created with zero answer leakage.

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
* **Step 7B-5 (Quiz Sessions):** 4 / 4 PASS
* **Step 7B-6 (Question Bank):** 5 / 5 PASS

### Frontend Checks
* **TypeScript:** 0 errors (`npx tsc --noEmit`)
* **Vite Build:** PASS (`npm run build` in 1.12s)
* **Oxlint:** 0 errors (10 non-blocking hook warnings)

### Live HTTP Health Checks
* `GET /health` -> HTTP 200 OK
* `GET /api/health` -> HTTP 200 OK
* `GET /api/assessment/question-bank` -> HTTP 200 OK
* `GET /api/assessment/question-bank/qb_45259ecede` -> HTTP 200 OK
* `POST /api/assessment/quizzes/from-bank` -> HTTP 201 Created
* `GET /api/learners/U001/progress` -> HTTP 200 OK
* `GET /api/v1/learner/progress` -> HTTP 200 OK
* `GET /api/v1/learner/competency-improvements` -> HTTP 200 OK
* `GET /api/v1/integration/learner-flow/2b574d66-f752-4348-ab00-17587012f291` -> HTTP 200 OK

---

## 12. REMAINING LIMITATIONS

* Vector store index remains on local FAISS (`backend/data/vector_store/index.faiss`).
* iGOT recommendations continue using the mock adapter.
