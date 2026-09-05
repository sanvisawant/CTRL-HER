"""
StatSaksham AI — Unified Backend Launcher
Runs the consolidated master backend on port 8000 from the repository root.
"""
import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
P3_BACKEND_DIR = ROOT_DIR / "ai based learning" / "backend"

if str(P3_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(P3_BACKEND_DIR))

if __name__ == "__main__":
    import uvicorn
    os.chdir(str(P3_BACKEND_DIR))
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
