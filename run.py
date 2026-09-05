"""
StatSaksham AI — Consolidated Platform Master Launcher (SIH26101)
Runs the unified FastAPI backend on port 8000 from the repository root.
"""
import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if __name__ == "__main__":
    import uvicorn
    os.chdir(str(BACKEND_DIR))
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
