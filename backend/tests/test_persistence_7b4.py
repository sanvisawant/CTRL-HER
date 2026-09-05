"""
Step 7B-4 — P3 Learner Progress & Mastery Supabase Restart Persistence Tests
Validates:
1. Supabase learner_progress table schema and topic-level row structure
2. Quiz -> Evaluation -> LearnerProgress update -> Supabase persistence integration flow
3. Restart persistence: Wipe in-memory cache, reload from Supabase, verify topic metrics survive
4. Cross-module compatibility: canonical identity 2b574d66-f752-4348-ab00-17587012f291
"""
import sys
import uuid
import unittest
from datetime import datetime
from pathlib import Path

# Setup paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "learning"))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "workforce"))

from integrations.identity_mapping import identity_service
from integrations.competency_mapping import competency_service
from integrations.supabase_persistence import (
    get_learner_progress_row,
    get_learner_topic_rows,
    upsert_learner_progress,
    check_table_exists
)
from services.learner_progress_repository import get_learner_progress_repository
from services.learner_progress_service import get_learner_progress_service
from services.quiz_repository import get_quiz_repository
from services.quiz_evaluator import QuizEvaluator
from models.assessment import (
    QuizSession,
    MCQItem,
    MCQOption,
    MCQSource,
    QuizSubmissionRequest,
    SingleAnswerSubmission,
    TopicPerformance
)
from models.learner_progress import (
    LearnerProgressProfile,
    LearnerTopicProgress,
    TopicAttemptHistory
)


class TestLearnerProgressPersistence7B4(unittest.TestCase):
    """Step 7B-4 test suite for durable learner progress in Supabase."""

    def setUp(self):
        self.repo = get_learner_progress_repository()
        self.service = get_learner_progress_service()
        self.learner_id = "U001"
        self.canonical_uid = "2b574d66-f752-4348-ab00-17587012f291"

    def test_01_schema_and_initial_migrated_topics(self):
        """Verify learner_progress table exists and migrated topics are present in Supabase."""
        self.assertTrue(check_table_exists("learner_progress"), "learner_progress table must exist in Supabase")

        topic_rows = get_learner_topic_rows(self.learner_id)
        self.assertGreaterEqual(len(topic_rows), 1, "At least one topic progress record must exist in Supabase")

        first = topic_rows[0]
        self.assertIn("topic", first)
        self.assertIn("accuracy", first)
        self.assertIn("recent_accuracy", first)
        self.assertIn("mastery_score", first)
        self.assertIn("mastery_state", first)
        self.assertIn("trend", first)
        self.assertEqual(str(first["canonical_user_id"]), self.canonical_uid)

    def test_02_quiz_to_progress_integration_and_persistence(self):
        """
        Integration Flow:
        Create Quiz Session -> Submit answers -> Evaluate -> Update LearnerProgressService
        -> Persist to Supabase -> Verify topic row accuracy and attempts changed in Supabase.
        """
        quiz_repo = get_quiz_repository()
        test_topic = f"Sampling Variance Estimation {uuid.uuid4().hex[:4]}"
        quiz_id = f"quiz_7b4_test_{uuid.uuid4().hex[:8]}"

        mcq = MCQItem(
            question_id=f"q_{uuid.uuid4().hex[:6]}",
            question="What is the primary advantage of stratified sampling?",
            options=[
                MCQOption(id="A", text="Reduces sampling variance within strata"),
                MCQOption(id="B", text="Guarantees zero non-sampling error"),
                MCQOption(id="C", text="Eliminates the need for a sampling frame"),
                MCQOption(id="D", text="Removes the need for random selection")
            ],
            correct_answer="A",
            explanation="Stratification groups homogeneous elements, reducing sampling variance.",
            difficulty="medium",
            topic=test_topic,
            source=MCQSource(
                document_id="doc_sampling_01",
                document="Sampling_Methodology.pdf",
                chunk_ids=["chunk_001"],
                locations=["Page 1"]
            )
        )

        session = QuizSession(
            quiz_id=quiz_id,
            learner_id=self.learner_id,
            canonical_user_id=self.canonical_uid,
            document_id="doc_sampling_01",
            topic=test_topic,
            difficulty="medium",
            created_at=datetime.utcnow().isoformat(),
            status="IN_PROGRESS",
            questions_snapshot=[mcq]
        )
        quiz_repo.save_quiz(session)

        # Submit answer A (correct)
        submission = QuizSubmissionRequest(
            answers=[SingleAnswerSubmission(question_id=mcq.question_id, selected_answer="A")]
        )
        result = QuizEvaluator.evaluate(session=session, submission=submission)
        session.status = "SUBMITTED"
        session.result = result
        quiz_repo.update_quiz(session)

        # Update longitudinal learner progress
        updated_profile = self.service.update_from_quiz_result(result, self.learner_id)
        self.assertIn(test_topic, updated_profile.topics)
        self.assertEqual(updated_profile.topics[test_topic].accuracy, 100.0)

        # Verify topic progress persisted into Supabase row
        raw_row = get_learner_progress_row(self.learner_id)
        self.assertIsNotNone(raw_row)
        self.assertIn(test_topic, raw_row["topics"])
        saved_topic = raw_row["topics"][test_topic]
        self.assertEqual(saved_topic["accuracy"], 100.0)
        self.assertEqual(saved_topic["attempts"], 1)
        self.assertEqual(saved_topic["correct_answers"], 1)

    def test_03_restart_persistence(self):
        """
        Restart Persistence Test:
        1. Read current progress
        2. Create a test topic with specific accuracy
        3. Save to Supabase
        4. Simulate server restart by wiping in-memory repository cache
        5. Reload progress from Supabase
        6. Verify state survives restart
        """
        test_topic = f"Index Number Methodology {uuid.uuid4().hex[:4]}"
        profile = self.repo.get_progress(self.learner_id)

        profile.topics[test_topic] = LearnerTopicProgress(
            topic=test_topic,
            attempts=2,
            questions_attempted=6,
            correct_answers=5,
            incorrect_answers=1,
            accuracy=83.33,
            recent_accuracy=83.33,
            status="MASTERED",
            trend="IMPROVING",
            first_seen_at=datetime.utcnow().isoformat(),
            last_practiced_at=datetime.utcnow().isoformat(),
            history=[
                TopicAttemptHistory(
                    quiz_id="quiz_restart_01",
                    accuracy=83.33,
                    questions=6,
                    correct=5,
                    incorrect=1,
                    timestamp=datetime.utcnow().isoformat()
                )
            ]
        )

        self.repo.save_progress(profile)

        # Simulate backend restart (cache wipe)
        self.repo._cache.clear()
        self.assertEqual(len(self.repo._cache), 0, "Cache must be empty to simulate restart")

        # Reload from Supabase
        reloaded = self.repo.get_progress(self.learner_id)
        self.assertIn(test_topic, reloaded.topics, "Topic progress must survive restart")
        reloaded_topic = reloaded.topics[test_topic]
        self.assertEqual(reloaded_topic.accuracy, 83.33)
        self.assertEqual(reloaded_topic.status, "MASTERED")
        self.assertEqual(reloaded_topic.trend, "IMPROVING")
        self.assertEqual(reloaded_topic.attempts, 2)

    def test_04_cross_module_canonical_identity_resolution(self):
        """
        Verify canonical demo identity resolves across all module IDs:
        P1 (UUID) <-> P2/P3 (U001) <-> P4 (usr_demo_001)
        and progress can be retrieved by canonical ID.
        """
        identity = identity_service.resolve(self.canonical_uid)
        self.assertIsNotNone(identity)
        self.assertEqual(identity.p2_learner_id, "U001")
        self.assertEqual(identity.p4_user_id, "usr_demo_001")

        # Query progress by canonical UUID
        raw = get_learner_progress_row(self.canonical_uid)
        self.assertIsNotNone(raw, "Must retrieve progress when passing canonical UUID")
        self.assertGreaterEqual(raw["total_tracked_topics"], 1)


if __name__ == "__main__":
    unittest.main()
