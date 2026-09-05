"""
Utility script to seed realistic MoSPI role benchmarks into the `role_benchmarks` table.
Roles seeded:
- Junior Statistical Officer (JSO)
- Senior Statistical Officer (SSO)
- Director (National Accounts)
- Data Analyst / AI Specialist
"""

import logging
from sqlalchemy import text
from database import SessionLocal
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("statsaksham.seed_benchmarks")

ROLE_BENCHMARKS_DATA = {
    "Junior Statistical Officer": {
        1: 3.5, 2: 3.8, 3: 2.5, 4: 3.2, 5: 3.2, 6: 3.0, 7: 3.0, 8: 3.0, 9: 3.0, 10: 3.8,
        11: 3.0, 12: 3.0, 13: 3.2, 14: 2.8, 15: 2.8, 16: 2.5, 17: 2.5, 18: 3.2, 19: 2.5, 20: 2.2, 21: 2.5, 22: 3.0,
        23: 2.8, 24: 3.0, 25: 3.2, 26: 2.5, 27: 2.8,
        28: 2.8, 29: 3.5, 30: 3.0, 31: 4.0, 32: 3.2, 33: 2.8
    },
    "Senior Statistical Officer": {
        1: 4.2, 2: 4.5, 3: 3.5, 4: 4.0, 5: 4.0, 6: 3.8, 7: 3.8, 8: 3.8, 9: 4.0, 10: 4.5,
        11: 3.8, 12: 3.8, 13: 4.0, 14: 3.5, 15: 3.5, 16: 3.2, 17: 3.5, 18: 4.0, 19: 3.2, 20: 3.0, 21: 3.2, 22: 3.8,
        23: 3.5, 24: 3.8, 25: 3.8, 26: 3.2, 27: 3.5,
        28: 3.8, 29: 4.0, 30: 3.8, 31: 4.5, 32: 4.0, 33: 3.5
    },
    "Director (National Accounts)": {
        1: 4.5, 2: 4.5, 3: 5.0, 4: 4.8, 5: 4.5, 6: 4.2, 7: 4.5, 8: 4.2, 9: 4.8, 10: 4.8,
        11: 3.5, 12: 3.5, 13: 3.8, 14: 3.5, 15: 3.5, 16: 3.5, 17: 3.2, 18: 4.2, 19: 3.5, 20: 3.2, 21: 3.2, 22: 4.0,
        23: 3.8, 24: 4.2, 25: 4.0, 26: 3.5, 27: 3.8,
        28: 4.8, 29: 4.8, 30: 4.8, 31: 5.0, 32: 4.8, 33: 4.5
    },
    "Data Analyst": {
        1: 3.8, 2: 4.0, 3: 3.0, 4: 3.2, 5: 3.0, 6: 2.8, 7: 3.0, 8: 3.5, 9: 3.8, 10: 4.5,
        11: 4.8, 12: 4.5, 13: 4.8, 14: 3.5, 15: 3.2, 16: 3.0, 17: 3.8, 18: 4.8, 19: 4.2, 20: 3.8, 21: 4.0, 22: 4.2,
        23: 3.8, 24: 4.0, 25: 3.5, 26: 3.5, 27: 3.5,
        28: 3.2, 29: 3.8, 30: 3.5, 31: 4.2, 32: 3.8, 33: 3.5
    }
}


def seed():
    with SessionLocal() as db:
        existing_count = db.query(models.RoleBenchmark).count()
        logger.info(f"Existing role benchmarks count: {existing_count}")

        if existing_count > 0:
            logger.info("Role benchmarks already seeded. Skipping.")
            return

        total_inserted = 0
        for role_name, bench_map in ROLE_BENCHMARKS_DATA.items():
            for comp_id, req_score in bench_map.items():
                db.add(models.RoleBenchmark(
                    job_role=role_name,
                    competency_id=comp_id,
                    required_score=req_score
                ))
                total_inserted += 1

        db.commit()
        logger.info(f"Successfully seeded {total_inserted} role benchmarks for MoSPI roles.")


if __name__ == "__main__":
    seed()
