# StatSaksham AI — Setup & Run Instructions (SIH26101)

## Prerequisites
- **Python**: 3.11+ (tested on Python 3.13)
- **Node.js**: 18+ (tested on Node v20+)
- **Git**

---

## 1. Backend Setup & Startup

1. Open a terminal in the project root:
```bash
# Optional: create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install consolidated dependencies
pip install -r backend/requirements.txt
```

2. Configure environment credentials in `backend/.env` (or copy from `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
P1_DATABASE_URL=postgresql://...supabase...
P4_DATABASE_URL=sqlite:///./data/statsaksham.db
PORT=8000
ENVIRONMENT=development
```

3. Launch the consolidated backend from the repository root:
```bash
python run.py
```
Backend will be live at: `http://localhost:8000`  
Swagger API documentation: `http://localhost:8000/docs`

---

## 2. Frontend Setup & Startup

1. Open a new terminal in the `frontend/` directory:
```bash
cd frontend
npm install
```

2. Start the Vite development server:
```bash
npm run dev
```
Frontend will be accessible at: `http://localhost:5173`

3. To create a production build:
```bash
npm run build
```

---

## 3. Running Verification Tests

Run the complete backend test suite from the repository root:
```bash
# 1. Zero-regression smoke tests (13/13 endpoints)
python backend/tests/test_smoke.py

# 2. Cross-module business flow tests (10/10 tests)
python backend/tests/test_cross_module.py

# 3. P1 Competency Intelligence tests
python backend/tests/test_competency.py
```
