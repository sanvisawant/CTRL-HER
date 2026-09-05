"""
Step 7B-3 — P4 Workforce Analytics & Gamification Restart Persistence Tests
Validates durable persistence in Supabase PostgreSQL (schema 'workforce') across simulated restarts:
- Test A: P4 User state update and canonical identity mapping survival
- Test B: Competency score state update and canonical link survival
- Test C: Gamification XP and Quest Progress persistence survival
- Test D: Achievement unlock persistence survival
All tests restore original state and clean up test records.
"""
import sys
import unittest
import uuid
from datetime import datetime
from pathlib import Path

# Setup paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "workforce"))

from app.core.database import SessionLocal, db_backend, active_schema
from app.models.user import User
from app.models.competency import Competency
from app.models.user_competency import UserCompetency
from app.models.quest import QuestChallenge, UserQuestProgress, Achievement, UserAchievement
from integrations.identity_mapping import identity_service
from integrations.competency_mapping import competency_service


class TestP4WorkforcePersistence7B3(unittest.TestCase):
    """Restart persistence tests for P4 Supabase workforce data."""

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_00_database_backend_is_supabase(self):
        """Verify that P4 is connected to Supabase PostgreSQL with schema 'workforce'."""
        self.assertEqual(db_backend, "supabase", f"Expected primary engine 'supabase', got '{db_backend}'")
        self.assertEqual(active_schema, "workforce", f"Expected active schema 'workforce', got '{active_schema}'")

    def test_a_user_state_and_canonical_mapping(self):
        """Test A: Update safe P4 user state, persist to Supabase, reload in fresh session, verify survival."""
        # 1. Load known P4 user
        user = self.db.query(User).filter(User.id == "usr_demo_001").first()
        self.assertIsNotNone(user, "User usr_demo_001 must exist")

        # 2. Confirm canonical identity mapping
        resolved = identity_service.resolve(user.id)
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.canonical_user_id, "2b574d66-f752-4348-ab00-17587012f291")
        self.assertEqual(user.canonical_user_id, "2b574d66-f752-4348-ab00-17587012f291")

        # 3. Update safe P4 state
        orig_goal = user.career_goal
        test_goal = f"National Data Strategy Specialist {uuid.uuid4().hex[:6]}"
        user.career_goal = test_goal
        self.db.commit()

        # 4. Simulate restart: Close session and recreate
        self.db.close()
        fresh_db = SessionLocal()
        try:
            reloaded_user = fresh_db.query(User).filter(User.id == "usr_demo_001").first()
            self.assertIsNotNone(reloaded_user)
            self.assertEqual(reloaded_user.career_goal, test_goal, "Updated career_goal must survive restart")
            self.assertEqual(reloaded_user.canonical_user_id, "2b574d66-f752-4348-ab00-17587012f291")
        finally:
            # Restore original state
            reloaded_user.career_goal = orig_goal
            fresh_db.commit()
            fresh_db.close()

        # Reopen self.db for tearDown
        self.db = SessionLocal()

    def test_b_competency_score_persistence(self):
        """Test B: Load mapped competency, verify canonical link, update score, reload in fresh session, verify survival."""
        # 1. Load mapped P4 competency
        comp = self.db.query(Competency).filter(Competency.id == "comp_python").first()
        self.assertIsNotNone(comp, "Competency comp_python must exist")
        self.assertEqual(comp.canonical_competency_id, 11, "Canonical ID for Python must be 11")

        # 2. Load user competency for usr_demo_001
        uc = self.db.query(UserCompetency).filter(
            UserCompetency.user_id == "usr_demo_001",
            UserCompetency.competency_id == "comp_python"
        ).first()
        self.assertIsNotNone(uc, "UserCompetency for comp_python must exist")

        orig_level = uc.current_level
        test_level = 4.88
        uc.current_level = test_level
        self.db.commit()

        # 3. Simulate restart
        self.db.close()
        fresh_db = SessionLocal()
        try:
            reloaded_uc = fresh_db.query(UserCompetency).filter(
                UserCompetency.user_id == "usr_demo_001",
                UserCompetency.competency_id == "comp_python"
            ).first()
            self.assertIsNotNone(reloaded_uc)
            self.assertEqual(reloaded_uc.current_level, test_level, "Competency score must survive restart")
            self.assertEqual(reloaded_uc.canonical_user_id, "2b574d66-f752-4348-ab00-17587012f291")
            self.assertEqual(reloaded_uc.canonical_competency_id, 11)
        finally:
            reloaded_uc.current_level = orig_level
            fresh_db.commit()
            fresh_db.close()

        self.db = SessionLocal()

    def test_c_gamification_progress_persistence(self):
        """Test C: Update XP and insert quest progress record, simulate restart, verify survival, clean up."""
        # 1. Update user XP
        user = self.db.query(User).filter(User.id == "usr_demo_001").first()
        self.assertIsNotNone(user)
        orig_xp = user.xp
        test_xp = (orig_xp or 0) + 75
        user.xp = test_xp

        # 2. Get an existing quest challenge
        qc = self.db.query(QuestChallenge).first()
        self.assertIsNotNone(qc, "At least one QuestChallenge must exist")

        # Create a test quest progress record
        test_prog_id = f"uqp_test_{uuid.uuid4().hex[:8]}"
        quest_prog = UserQuestProgress(
            id=test_prog_id,
            user_id="usr_demo_001",
            quest_challenge_id=qc.id,
            status="COMPLETED",
            score=96.5,
            xp_earned=120,
            user_submission_json='{"answer": "SELECT COUNT(*) FROM surveys"}',
            feedback_json='{"passed": true, "evaluation": "Optimal query execution"}',
            completed_at=datetime.utcnow()
        )
        self.db.add(quest_prog)
        self.db.commit()

        # 3. Simulate restart
        self.db.close()
        fresh_db = SessionLocal()
        try:
            reloaded_user = fresh_db.query(User).filter(User.id == "usr_demo_001").first()
            self.assertEqual(reloaded_user.xp, test_xp, "XP update must survive restart")

            reloaded_prog = fresh_db.query(UserQuestProgress).filter(UserQuestProgress.id == test_prog_id).first()
            self.assertIsNotNone(reloaded_prog, "UserQuestProgress record must survive restart")
            self.assertEqual(reloaded_prog.status, "COMPLETED")
            self.assertEqual(reloaded_prog.score, 96.5)
            self.assertEqual(reloaded_prog.xp_earned, 120)
        finally:
            # Clean up test records and restore XP
            fresh_db.query(UserQuestProgress).filter(UserQuestProgress.id == test_prog_id).delete()
            reloaded_user.xp = orig_xp
            fresh_db.commit()
            fresh_db.close()

        self.db = SessionLocal()

    def test_d_achievement_persistence(self):
        """Test D: Load achievement, add temporary user achievement, simulate restart, verify survival, clean up."""
        # 1. Verify achievement definition exists
        ach = self.db.query(Achievement).first()
        self.assertIsNotNone(ach, "At least one Achievement must exist")

        # 2. Create temporary user achievement record
        test_ua_id = f"ua_test_{uuid.uuid4().hex[:8]}"
        user_ach = UserAchievement(
            id=test_ua_id,
            user_id="usr_demo_001",
            achievement_id=ach.id,
            unlocked_at=datetime.utcnow()
        )
        self.db.add(user_ach)
        self.db.commit()

        # 3. Simulate restart
        self.db.close()
        fresh_db = SessionLocal()
        try:
            reloaded_ua = fresh_db.query(UserAchievement).filter(UserAchievement.id == test_ua_id).first()
            self.assertIsNotNone(reloaded_ua, "UserAchievement record must survive restart")
            self.assertEqual(reloaded_ua.user_id, "usr_demo_001")
            self.assertEqual(reloaded_ua.achievement_id, ach.id)
        finally:
            fresh_db.query(UserAchievement).filter(UserAchievement.id == test_ua_id).delete()
            fresh_db.commit()
            fresh_db.close()

        self.db = SessionLocal()


if __name__ == "__main__":
    unittest.main()
