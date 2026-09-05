"""
StatSaksham AI — Module P1 Integration Bridge
Safely loads P1 routers (Profile, Competencies, Gap & Twin) into an isolated namespace,
preventing top-level module collisions with P3 (config, models, services).
"""
import os
import sys
import logging
import importlib.util
from pathlib import Path

logger = logging.getLogger("statsaksham.integrations.p1_bridge")

# Resolve absolute path to competency-intelligence-p1/backend
_CURRENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _CURRENT_DIR.parent.parent.parent
P1_BACKEND_DIR = _REPO_ROOT / "competency-intelligence-p1" / "backend"

def load_p1_components():
    """
    Loads P1's config, database, models, schemas, services, and routers
    under isolated module references so sys.modules['config'], ['models'],
    and ['services'] from P3 are never polluted or overwritten.
    """
    if not P1_BACKEND_DIR.exists():
        logger.error(f"P1 backend directory not found at: {P1_BACKEND_DIR}")
        return None, None, None, None, None

    saved_modules = {k: sys.modules[k] for k in ['config', 'models', 'services', 'database', 'schemas', 'ai_evaluator'] if k in sys.modules}
    saved_path = list(sys.path)

    try:
        sys.path.insert(0, str(P1_BACKEND_DIR))

        def _load(name: str, relative_path: str):
            full_path = P1_BACKEND_DIR / relative_path
            spec = importlib.util.spec_from_file_location(name, str(full_path))
            mod = importlib.util.module_from_spec(spec)
            sys.modules[name] = mod
            spec.loader.exec_module(mod)
            return mod

        # Load P1 core modules
        p1_config = _load("p1_config", "config.py")
        sys.modules["config"] = p1_config

        p1_database = _load("p1_database", "database.py")
        sys.modules["database"] = p1_database

        p1_models = _load("p1_models", "models.py")
        sys.modules["models"] = p1_models

        p1_schemas = _load("p1_schemas", "schemas.py")
        sys.modules["schemas"] = p1_schemas

        p1_services = _load("p1_services", "services.py")
        sys.modules["services"] = p1_services

        p1_ai_eval = _load("p1_ai_evaluator", "ai_evaluator.py")
        sys.modules["ai_evaluator"] = p1_ai_eval = p1_ai_eval

        # Load P1 routers
        p1_profile_mod = _load("p1_router_profile", os.path.join("routers", "profile.py"))
        p1_comp_mod = _load("p1_router_competencies", os.path.join("routers", "competencies.py"))
        p1_gap_mod = _load("p1_router_gap_and_twin", os.path.join("routers", "gap_and_twin.py"))

        logger.info("P1 modules and routers loaded successfully through isolated bridge.")
        return (
            p1_profile_mod.router,
            p1_comp_mod.router,
            p1_gap_mod.router,
            p1_database.SessionLocal,
            p1_config.get_settings(),
            p1_services,
            p1_models
        )
    finally:
        # Restore sys.path and previous module definitions
        sys.path = saved_path
        for k in ['config', 'models', 'services', 'database', 'schemas', 'ai_evaluator']:
            if k in saved_modules:
                sys.modules[k] = saved_modules[k]
            elif k in sys.modules:
                del sys.modules[k]

# Execute bridge loader at module import time
p1_profile_router, p1_competencies_router, p1_gap_and_twin_router, p1_session_local, p1_settings, p1_services, p1_models = load_p1_components()

