# STEP 7B-7 — DOCUMENT PERSISTENCE & RESTART HARDENING REPORT

## 1. AUDIT FINDINGS

An audit of the learning document persistence and vector retrieval architecture in StatSaksham AI was conducted:

* **Document Metadata Storage & Source of Truth**:
  * Supabase PostgreSQL `public.documents` table holds 27 active learning document metadata records.
  * `DocumentRegistry` ([backend/integrations/document_registry.py](file:///c:/Users/vishr/Downloads/sih/backend/integrations/document_registry.py)) operates as a synchronized dictionary (`_SyncedDocumentDict`) wrapping the Supabase client.
  * In [backend/modules/learning/routes/documents.py](file:///c:/Users/vishr/Downloads/sih/backend/modules/learning/routes/documents.py), `_documents_db = get_document_registry()` delegates directly to Supabase with write-through updates and eager/lazy fetching.
* **Raw File Location**:
  * Stored on the local filesystem under `backend/data/uploads/` (PDF, DOCX, PPTX).
* **Extraction & Chunk Storage**:
  * Extracted text blocks and structured JSON reside in `backend/data/chunks/` and `backend/data/extracted/`.
* **Embedding Storage**:
  * Document and chunk embeddings reside in `backend/data/embeddings/`.
* **FAISS Vector Store**:
  * Index binary: `backend/data/vector_store/faiss_index.bin`
  * Metadata JSON: `backend/data/vector_store/metadata.json`
* **Startup & Rebuild Behavior**:
  * On backend startup or process restart, `DocumentRegistry` fetches all active records from Supabase on demand (`_load_from_supabase()`).
  * `VectorStore` loads `faiss_index.bin` and `metadata.json`. If local FAISS indices exist, vectors remain persistent without re-embedding.
* **Document Status Lifecycle**:
  * States: `UPLOADED` -> `CHUNKED` -> `EMBEDDED` -> `INDEXED` (or `ERROR`).
  * State transitions update Supabase synchronously through `document_registry[doc_id] = doc` (invoking `upsert_document()`).
* **Document Identity**:
  * Stable UUIDs or slug keys (`doc_nss_78th`, `doc_cpi_manual`, `doc_sdg_indicators`, etc.) are preserved end-to-end across Supabase `documents`, file paths, chunk JSONs, FAISS metadata, and citations.

---

## 2. SELECTED PATH

**PATH A — ALREADY CORRECT**

> "No document persistence migration was required because the existing implementation already provides durable Supabase metadata with the existing file/vector infrastructure."

All document metadata and state transitions are already durably persisted in Supabase `public.documents`. Raw files, extracted chunks, and FAISS vector indices correctly remain on the local derived filesystem per architectural specifications.

---

## 3. DOCUMENT ARCHITECTURE

```text
Uploaded PDF/PPTX/DOCX
         ↓
Local File Storage (`backend/data/uploads/`)
         ↓
Document Metadata (`DocumentRegistry`)
         ↓
Supabase PostgreSQL (`public.documents`)
         ↓
Extraction / Cleaning / Chunking (`backend/data/chunks/`)
         ↓
Embeddings (`backend/data/embeddings/`)
         ↓
FAISS Index & Metadata (`backend/data/vector_store/`)
         ↓
Semantic Search (`/api/search`) & RAG Assistant (`/api/learning-assistant/ask`)
```

---

## 4. METADATA SOURCE OF TRUTH

Supabase table `public.documents` is the primary source of truth:
* Schema:
  * `document_id` (Text / Primary Key)
  * `filename` (Text)
  * `file_type` (Text)
  * `file_size` (Integer)
  * `upload_path` (Text)
  * `status` (Text: `UPLOADED`, `CHUNKED`, `EMBEDDED`, `INDEXED`, `ERROR`)
  * `pages` (Integer)
  * `text_blocks` (Integer)
  * `chunks` (Integer)
  * `description` (Text)
  * `uploaded_by` (Text)
  * `uploaded_at` (Timestamp)
  * `created_at`, `updated_at` (Timestamps)

---

## 5. FILE STORAGE

Uploaded binary files are stored in `backend/data/uploads/`.
Derived data is saved in:
* `backend/data/chunks/`
* `backend/data/extracted/`
* `backend/data/embeddings/`
* `backend/data/vector_store/`

No large binaries are stored in Supabase relational tables.

---

## 6. FAISS RELATIONSHIP

FAISS operates locally using L2 normalized inner product for cosine similarity retrieval:
* FAISS vector index contains 24 embedded chunks across 11 core documents.
* In FAISS `metadata.json`, every indexed chunk references a valid `document_id`.
* Verification confirmed **0 orphaned vectors**: 100% of document IDs indexed in FAISS metadata exist in Supabase `documents`.

---

## 7. DOCUMENT ID CONSISTENCY

Stable document IDs (e.g., `doc_nss_78th`, `doc_cpi_manual`, `doc_sdg_indicators`) remain consistent across:
1. Supabase `documents` table
2. Local upload file references (`backend/data/uploads/...`)
3. Extracted chunk filenames (`backend/data/chunks/{doc_id}_chunks.json`)
4. FAISS index metadata (`metadata.json`)
5. Semantic Search responses (`SearchResultItem.document_id`)
6. RAG Assistant citations (`SourceCitation.document_id`)
7. Question Bank question provenance (`QuestionProvenance.document_id`)

---

## 8. RESTART BEHAVIOR

Restart synchronization was verified in automated suite `backend/tests/test_persistence_7b7.py`:
1. Metadata for existing and new documents was confirmed in Supabase.
2. In-memory `DocumentRegistry` caches (`_docs_cache`, `_loaded`) were wiped cleanly to simulate a complete process death and cold restart.
3. Upon accessing `DocumentRegistry`, records were immediately reloaded from Supabase with status and metadata intact.
4. Server process restart (daemon `task-3711`) verified live endpoints `/api/documents`, `/api/documents/{doc_id}/preview`, `/api/search`, and `/api/learning-assistant/ask` remain 100% operational after restart.

---

## 9. SEMANTIC SEARCH VERIFICATION

Semantic search was verified using `/api/search`:
* Query: *"National Sample Survey consumer expenditure methodology"*
* Top Match: `doc_nss_78th` with similarity score > 0.40.
* Chunk content, topic metadata, and document ID accurately returned from local FAISS vector store.

---

## 10. RAG VERIFICATION

Grounded RAG generation was verified using `/api/learning-assistant/ask`:
* Query: *"What is the methodology of the NSS 78th round survey?"*
* Response: Status `ANSWERED`, high confidence.
* Grounding: Answer synthesized from retrieved chunks.
* Citations: Valid `SourceCitation` pointing to `doc_nss_78th`, with exact page numbers and chunk texts matching the underlying document.

---

## 11. MCQ PROVENANCE VERIFICATION

* Trainer question bank questions preserve `document_id` and `chunk_id` in their metadata provenance.
* Approved questions in Supabase retain persistent links back to `doc_nss_78th` and `doc_cpi_manual`.

---

## 12. RESET / DELETE BEHAVIOR

Document deletion cleanly coordinates:
* Supabase record removal via `delete_document(document_id)`.
* Local upload and chunk file cleanup where applicable.
* No orphaned references left in the persistent document registry.

---

## 13. REGRESSION & TEST RESULTS

All validation test suites passed with 0 failures:

| Suite | Tests | Result |
|---|---|---|
| Backend Master Regression (`test_smoke.py`) | 13 | PASS (13/13) |
| Cross-Module Integration (`test_cross_module.py`) | 10 | PASS (10/10) |
| Competency Suite (`test_competency.py`) | 8 | PASS (8/8) |
| Workforce Suite (`test_workforce.py`) | 12 | PASS (12/12) |
| 7B-1 Identity & Document Persistence | 3 | PASS (3/3) |
| 7B-2 P3 Learning Persistence | 3 | PASS (3/3) |
| 7B-3 P4 Workforce Persistence | 5 | PASS (5/5) |
| 7B-4 Learner Progress Persistence | 4 | PASS (4/4) |
| 7B-5 Quiz Sessions Persistence | 4 | PASS (4/4) |
| 7B-6 Question Bank Persistence | 5 | PASS (5/5) |
| **7B-7 Document Persistence & Restart** | 5 | **PASS (5/5)** |
| **Total Backend Tests** | **72** | **PASS (72/72)** |
| Frontend TypeScript (`tsc -b`) | - | 0 errors |
| Frontend Vite Build (`npm run build`) | - | PASS (1.04s) |
| Frontend Oxlint (`npx oxlint`) | - | 0 errors |

---

## 14. REMAINING LIMITATIONS

* FAISS vector embeddings are stored locally on filesystem (`backend/data/vector_store/`); horizontal multi-node scaling would require a shared volume or synchronized local stores.
* Document uploading is designed for single-node filesystem storage (`backend/data/uploads/`), which matches current architecture requirements.
