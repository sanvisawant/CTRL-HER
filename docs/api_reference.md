# StatSaksham AI — Consolidated API Reference (SIH26101)

All endpoints run under the consolidated master backend on **port 8000**.

---

## 1. Cross-Module Integration Endpoints (`/api/v1/integration`)

| Endpoint | Method | Params / Payload | Description |
| :--- | :---: | :--- | :--- |
| `/api/v1/integration/learner-flow/{user_id}` | `GET` | `user_id` (Cadre ID or UUID) | Retrieves unified status: canonical identity, P1 gaps, and P2 recommendations |
| `/api/v1/integration/recommendations/{user_id}` | `GET` | `user_id`, `limit` | Maps P1 competency gaps to prioritized iGOT courses |
| `/api/v1/integration/learning-context/{user_id}/{comp_id}` | `GET` | `user_id`, `comp_id` | Bridges P1 competency gap to P3 study topics |

---

## 2. P1 Competency Intelligence Endpoints (`/api/v1`)

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/competencies` | `GET` | All 33 master MoSPI competencies grouped by category |
| `/api/competencies` | `GET` | Backward-compatibility alias for `/api/v1/competencies` |
| `/api/v1/profile/create` | `POST` | Onboard an official profile & trigger baseline evaluation |
| `/api/v1/profile/{official_id}` | `GET` | Retrieve official profile details and 33 evaluated scores |
| `/api/v1/competency/gaps/{official_id}` | `GET` | Role benchmark skill gaps, priorities, and rationales |
| `/api/v1/competency/radar/{official_id}` | `GET` | Radar chart data points (competency and category levels) |
| `/api/v1/competency/digital-twin/{official_id}` | `GET` | Digital Twin readiness percentage and milestones |

---

## 3. P2 iGOT Karmayogi Catalog Endpoints (`/api/igot`)

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/igot/courses` | `GET` | Complete iGOT course catalog (10 prototype programs) |
| `/api/igot/courses/{course_id}` | `GET` | Course detail by ID |
| `/api/igot/users/{user_id}/progress` | `GET` | User course enrollment progress |
| `/api/igot/recommendations` | `GET` | Course recommendations based on query skill gaps |

---

## 4. P3 Grounded Learning, RAG & Assessment (`/api`)

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Learning subsystem health check |
| `/api/documents` | `GET` | List all ingested MoSPI manuals and vector statuses |
| `/api/search` | `POST` | Dense FAISS semantic vector search (`query`, `top_k`) |
| `/api/learning-assistant/ask` | `POST` | Grounded RAG conversational Q&A with citations |
| `/api/assessment/quizzes` | `POST` | Generate learner-safe quiz session from indexed document |
| `/api/assessment/quizzes/{quiz_id}` | `GET` | Retrieve quiz session questions |
| `/api/assessment/quizzes/{quiz_id}/submit` | `POST` | Submit answers, receive evaluation & trigger P4 XP hook |
| `/api/learners/{learner_id}/progress` | `GET` | Retrieve learner topic mastery progress profile |

---

## 5. P4 Workforce Intelligence, Heatmaps & Quest (`/api/v1`)

| Endpoint | Method | Headers / Params | Description |
| :--- | :---: | :--- | :--- |
| `/api/v1/admin/dashboard` | `GET` | `X-User-Role: admin` | Complete ministry-level workforce KPIs |
| `/api/v1/admin/workforce` | `GET` | `X-User-Role: admin` | Top-level workforce numbers |
| `/api/v1/admin/departments` | `GET` | `X-User-Role: admin` | Department-level competency metrics |
| `/api/v1/admin/heatmap` | `GET` | `domain`, `department` | 2D Department × Competency heatmap matrix |
| `/api/v1/quest/home` | `GET` | `X-User-Id` | Player gamification hub (Level, XP, streak, missions) |
| `/api/v1/quest/daily-challenge` | `GET` | — | 2-minute daily statistical micro-challenge |
| `/api/v1/quest/submit` | `POST` | `user_id`, `challenge_id` | Evaluate challenge and award XP |
| `/api/v1/analytics/what-if` | `POST` | Simulation payload | Workforce policy what-if simulation |
