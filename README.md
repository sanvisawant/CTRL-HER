# StatSaksham AI — National Statistical Capacity Building Platform

**Ministry of Statistics and Programme Implementation (MoSPI)**  
**Smart India Hackathon 2026 — Problem Statement: SIH26101**

StatSaksham AI is an enterprise-grade, in-service capacity building platform tailored for Indian Statistical Service (ISS) officers and statistical personnel across MoSPI divisions (NSSO, CSO, FOD, NAD, ESD, SDRD).

---

## 🏛️ System Overview

The platform unifies four critical pillars under a single coherent architecture:

1. **Competency Intelligence & Digital Twin (Module P1)**:
   - 33 canonical MoSPI competencies anchored on national statistical standards.
   - Benchmark gap diagnostics, priority classification, and real-time Digital Twin readiness tracking.
2. **iGOT Karmayogi Personalized Recommendations (Module P2)**:
   - Dynamic recommendation engine linking identified competency gaps to the national iGOT catalog.
   - Transparent prototype integration via mock iGOT adapter.
3. **Grounded In-Service Learning & Assessment (Module P3)**:
   - Multi-format ingestion of official MoSPI manuals (NSS, PLFS, CPI) into a 384-dimensional FAISS dense vector store.
   - Grounded RAG conversational AI assistant with cited source chunk locations.
   - Learner-safe diagnostic assessment with concealed answer keys and automated scoring.
4. **Workforce Analytics & Competency Quest (Module P4)**:
   - Ministry-wide cadre intelligence for 12,450 officials across operational divisions.
   - 2D Department × Competency Status Heatmap Matrix (Critical, Moderate, Proficient).
   - Gamified Competency Quest featuring XP progression, levels, daily 2-minute micro-challenges, and missions.
5. **Unified Government Frontend (Module P5)**:
   - Single, coherent React 19 + Tailwind CSS v4 portal with bilingual support (English, Hindi, Marathi) and official government visual identity.

---

## 📂 Repository Structure

```text
STATSAKSHAM-AI/
├── backend/                      # Consolidated Master FastAPI Backend
│   ├── main.py                   # Unified ASGI application entrypoint
│   ├── requirements.txt          # Consolidated Python dependencies
│   ├── core/                     # Shared configuration & security
│   ├── integrations/             # Cross-module workflow & identity resolution
│   ├── modules/                  # Isolated subsystem packages
│   │   ├── competency/           # P1: Competency Intelligence (Supabase)
│   │   ├── learning/             # P3: In-Service Learning & RAG (FAISS)
│   │   └── workforce/            # P4: Workforce Analytics & Gamification (SQLite)
│   ├── data/                     # Persistent runtime data (FAISS index, SQLite, PDFs)
│   └── tests/                    # Consolidated test suites (43/43 passing)
│
├── frontend/                     # Unified React 19 Portal
│   ├── src/                      # Features, components, context, and centralized API client
│   └── package.json
│
├── docs/                         # Platform Architecture & API Reference
│   ├── architecture.md
│   ├── api_reference.md
│   └── setup_instructions.md
│
├── run.py                        # Universal master backend launcher
└── README.md
```

---

## 🚀 Quick Start

### 1. Launch Backend (Port 8000)
```bash
pip install -r backend/requirements.txt
python run.py
```
Backend API documentation available at: `http://localhost:8000/docs`

### 2. Launch Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
Access portal at: `http://localhost:5173`

### 3. Run Automated Tests
```bash
python backend/tests/test_smoke.py
python backend/tests/test_cross_module.py
python backend/tests/test_competency.py
```

---

## 🔒 Architectural Principles Preserved
- **Canonical Identity**: P1 UUID / Cadre ID (`ISS-2024-8921`) resolved across modules via `IdentityMappingService`.
- **Canonical Taxonomy**: 33 official MoSPI competencies strictly maintained across all modules.
- **Storage Boundaries**: P1 Supabase PostgreSQL, P3 FAISS + JSON, P4 SQLite (`backend/data/statsaksham.db`).
- **Explainable AI**: Grounded RAG with exact document citations; zero hallucination tolerance.
