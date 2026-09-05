# StatSaksham AI — System Architecture (SIH26101)

**Ministry of Statistics & Programme Implementation (MoSPI)**  
**Smart India Hackathon 2026**

---

## 1. High-Level Architectural Flow

```text
                                  ┌─────────────────────────────┐
                                  │      UNIFIED FRONTEND       │
                                  │     (React 19 / Vite)       │
                                  └──────────────┬──────────────┘
                                                 │ HTTP / JSON (Port 8000)
                                                 ▼
             ┌───────────────────────────────────────────────────────────────────────┐
             │               CONSOLIDATED MASTER FASTAPI BACKEND                     │
             │                           (backend/main.py)                           │
             ├───────────────────────────────────────────────────────────────────────┤
             │ • Canonical Identity & Mapping Service (integrations/identity_mapping)│
             │ • Canonical 33 MoSPI Competencies (integrations/competency_mapping)   │
             │ • Cross-Module Workflow Service (integrations/workflow_service)       │
             └───────┬───────────────────┬───────────────────┬───────────────────┬───┘
                     │                   │                   │                   │
                     ▼                   ▼                   ▼                   ▼
           ┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
           │    MODULE P1     │ │    MODULE P2    │ │    MODULE P3    │ │    MODULE P4     │
           │  Competency &    │ │ iGOT Karmayogi  │ │ In-Service RAG  │ │ Workforce Admin  │
           │   Digital Twin   │ │ Recommendation  │ │ & Diagnostic    │ │ Analytics, 2D    │
           │  (PostgreSQL /   │ │     Engine      │ │ Assessment      │ │ Heatmap & Quest  │
           │    Supabase)     │ │ (Mock Adapter)  │ │ (FAISS + JSON)  │ │ (SQLite Engine)  │
           └──────────────────┘ └─────────────────┘ └─────────────────┘ └──────────────────┘
```

---

## 2. Subsystem Responsibilities

### Module P1: Competency Intelligence & Digital Twin
- **Canonical MoSPI Competency Dictionary**: 33 seeded competencies across 4 domains (Statistical, Technical, Digital Governance, Behavioural & Managerial).
- **Evaluation Engine**: Automated role benchmark evaluation, calculating skill gap deltas (1.0 to 5.0 scale), gap priority categorizations (`HIGH`, `MEDIUM`, `LOW`), and critical intervention flags.
- **Storage**: Cloud PostgreSQL on Supabase (Session pooler port 5432).

### Module P2: iGOT Karmayogi Recommendation Adapter
- **Dynamic Matching Engine**: Connects P1 competency gap outputs to target learning courses from the national capacity building catalog.
- **Prototype Adapter**: Implements `MockIGOTAdapter` with 10 simulated official training programs, accurately reflecting course metadata, competencies addressed, duration, and target cadres.

### Module P3: Grounded AI Learning & Assessment Engine
- **In-Service Document Processing**: Extracts, chunks, and embeds official MoSPI manuals (NSS, PLFS, CPI, System of National Accounts) using `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- **Vector Retrieval**: Local FAISS vector repository (`learning_materials.faiss` & `metadata.json`) containing 24 embedded chunks across 11 official publications.
- **Grounded AI Learning Assistant**: Strict RAG answering with transparent source chunk citations and confidence scoring.
- **Learner-Safe Assessment**: Diagnostic quiz generation with concealed answer keys on generation, verified submission grading, and pedagogical explanations.

### Module P4: Workforce Intelligence, Heatmap & Gamification
- **Administrative Intelligence**: Cadre-level metrics across 12,450 officials, NSSO, CSO, FOD, NAD, ESD, and SDRD divisions.
- **2D Competency Heatmap**: Matrix of Department × Competency Status with color-coded operational health (Critical < 2.5, Moderate 2.5–3.4, Proficient >= 3.5).
- **Gamification Engine**: Official competency quest hub featuring XP progression, levels, daily streaks, 2-minute daily micro-challenges, and real-world statistical missions.
- **Storage**: Embedded SQLite database (`backend/data/statsaksham.db`).
