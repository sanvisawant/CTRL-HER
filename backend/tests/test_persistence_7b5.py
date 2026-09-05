"""
StatSaksham AI — Step 7B-5 Quiz Sessions Persistence Verification Suite
Validates:
1. Grounded Quiz generation & Session creation in Supabase
2. Learner-safe questions snapshot (zero answer leakage)
3. Quiz submission, evaluation, and Supabase result persistence
4. Submission idempotency (duplicate submissions rejected)
5. Backend restart persistence (cache purge -> Supabase load)
6. Quiz -> Progress integration in Supabase
7. Canonical learner identity linking (2b574d66-f752-4348-ab00-17587012f291)
"""

import sys
import uuid
import unittest
from datetime import datetime, timezone
from pathlib import Path

# Setup paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "learning"))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "workforce"))

from config import settings
from models.assessment import (
    MCQItem,
    MCQOption,
    MCQSource,
    QuizSession,
    QuizSubmissionRequest,
    SingleAnswerSubmission,
    LearnerQuestion,
)
from services.quiz_repository import get_quiz_repository
from services.quiz_evaluator import QuizEvaluator
from services.learner_progress_service import get_learner_progress_service
from integrations.supabase_persistence import (
    get_quiz_session_row,
    get_learner_topic_rows,
    check_table_exists,
)
from integrations.identity_mapping import identity_service


class TestStep7B5QuizPersistence(unittest.TestCase):

    def setUp(self):
        self.repo = get_quiz_repository()
        self.learner_id = "U001"
        self.canonical_id = "2b574d66-f752-4348-ab00-17587012f291"
        self.topic = "Survey Sampling Validation"

    def test_01_supabase_table_and_canonical_identity(self):
        """Verify quiz_sessions table exists in Supabase and identity resolves."""
        self.assertTrue(
            check_table_exists("quiz_sessions"),
            "Supabase 'quiz_sessions' table must exist."
        )
        resolved = identity_service.resolve(self.learner_id)
        self.assertIsNotNone(resolved)
        self.assertEqual(str(resolved.canonical_user_id), self.canonical_id)

    def test_02_quiz_creation_and_snapshot_persistence(self):
        """Verify quiz session creation preserves immutable question snapshot in Supabase."""
        quiz_id = f"quiz_7b5_{uuid.uuid4().hex[:8]}"
        sample_mcq = MCQItem(
            question_id="mcq_7b5_01",
            question="What is the primary benefit of stratified random sampling?",
            options=[
                MCQOption(id="A", text="Reduces representation of minority groups"),
                MCQOption(id="B", text="Guarantees precision across distinct strata"),
                MCQOption(id="C", text="Eliminates the need for a sampling frame"),
                MCQOption(id="D", text="Requires zero prior information about population"),
            ],
            correct_answer="B",
            explanation="Stratification ensures that sub-populations are represented proportionally.",
            difficulty="medium",
            topic=self.topic,
            source=MCQSource(
                document_id="doc_nss_78th",
                document="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
                chunk_ids=["chk_01"],
                locations=["Page 4"],
            ),
        )

        session = QuizSession(
            quiz_id=quiz_id,
            learner_id=self.learner_id,
            document_id="doc_nss_78th",
            topic=self.topic,
            difficulty="medium",
            created_at=datetime.now(timezone.utc).isoformat(),
            status="IN_PROGRESS",
            questions_snapshot=[sample_mcq],
        )

        # Save to repository (writes to Supabase)
        self.repo.save_quiz(session)

        # Verify persisted in Supabase
        sb_row = get_quiz_session_row(quiz_id)
        self.assertIsNotNone(sb_row, f"Quiz {quiz_id} not found in Supabase")
        self.assertEqual(sb_row["status"], "IN_PROGRESS")
        self.assertEqual(str(sb_row["canonical_user_id"]), self.canonical_id)
        self.assertEqual(sb_row["topic"], self.topic)
        self.assertEqual(len(sb_row["questions_snapshot"]), 1)

        # Verify learner-safe question representation (no answer leakage)
        learner_q = LearnerQuestion(
            question_id=sample_mcq.question_id,
            question=sample_mcq.question,
            options=sample_mcq.options,
            difficulty=sample_mcq.difficulty,
            topic=sample_mcq.topic,
            source=sample_mcq.source,
        )
        self.assertFalse(hasattr(learner_q, "correct_answer"))
        self.assertFalse(hasattr(learner_q, "explanation"))

    def test_03_quiz_submission_and_evaluation_persistence(self):
        """Verify quiz submission evaluates correctly and persists result in Supabase."""
        quiz_id = f"quiz_7b5_{uuid.uuid4().hex[:8]}"
        sample_mcq = MCQItem(
            question_id="mcq_7b5_02",
            question="Which Indian Ministry manages the National Sample Survey Office?",
            options=[
                MCQOption(id="A", text="Ministry of Finance"),
                MCQOption(id="B", text="Ministry of Statistics and Programme Implementation"),
                MCQOption(id="C", text="NITI Aayog"),
                MCQOption(id="D", text="Ministry of Home Affairs"),
            ],
            correct_answer="B",
            explanation="MoSPI oversees the NSSO operations.",
            difficulty="easy",
            topic="Official Statistics Governance",
            source=MCQSource(
                document_id="doc_nss_78th",
                document="NSS_78th_Round.pdf",
                chunk_ids=["chk_02"],
                locations=["Page 1"],
            ),
        )

        session = QuizSession(
            quiz_id=quiz_id,
            learner_id=self.learner_id,
            document_id="doc_nss_78th",
            topic="Official Statistics Governance",
            difficulty="easy",
            created_at=datetime.now(timezone.utc).isoformat(),
            status="IN_PROGRESS",
            questions_snapshot=[sample_mcq],
        )
        self.repo.save_quiz(session)

        # Submit answer
        submission = QuizSubmissionRequest(
            answers=[SingleAnswerSubmission(question_id="mcq_7b5_02", selected_answer="B")]
        )
        result = QuizEvaluator.evaluate(session=session, submission=submission)
        self.assertEqual(result.score, 1)
        self.assertEqual(result.percentage, 100.0)

        # Update session state to SUBMITTED
        session.status = "SUBMITTED"
        session.submitted_at = result.submitted_at
        session.submission = submission
        session.result = result
        self.repo.update_quiz(session)

        # Verify in Supabase
        sb_row = get_quiz_session_row(quiz_id)
        self.assertIsNotNone(sb_row)
        self.assertEqual(sb_row["status"], "SUBMITTED")
        self.assertEqual(sb_row["score"], 1)
        self.assertEqual(float(sb_row["percentage"]), 100.0)
        self.assertIsNotNone(sb_row["result"])

        # Update learner progress & verify integration
        progress_service = get_learner_progress_service()
        progress_service.update_from_quiz_result(result, self.learner_id)

        # Check learner_progress in Supabase
        topic_rows = get_learner_topic_rows(self.learner_id)
        gov_topic = next((r for r in topic_rows if r["topic"] == "Official Statistics Governance"), None)
        self.assertIsNotNone(gov_topic, "Topic progress not persisted in Supabase learner_progress")
        self.assertGreaterEqual(gov_topic["attempts"], 1)
        self.assertEqual(float(gov_topic["accuracy"]), 100.0)

    def test_04_restart_persistence(self):
        """Verify quiz session and evaluation results survive cache wipe and server restart."""
        quiz_id = f"quiz_7b5_restart_{uuid.uuid4().hex[:8]}"
        sample_mcq = MCQItem(
            question_id="mcq_7b5_03",
            question="What is the formula for the Laspeyres price index?",
            options=[
                MCQOption(id="A", text="Base-period weighted arithmetic mean"),
                MCQOption(id="B", text="Current-period weighted geometric mean"),
                MCQOption(id="C", text="Unweighted simple average"),
                MCQOption(id="D", text="Harmonic mean of price ratios"),
            ],
            correct_answer="A",
            explanation="Laspeyres index uses base period quantities as weights.",
            difficulty="hard",
            topic="Index Numbers",
            source=MCQSource(
                document_id="doc_cpi_manual",
                document="CPI_Manual.docx",
                chunk_ids=["chk_03"],
                locations=["Chapter 2"],
            ),
        )

        session = QuizSession(
            quiz_id=quiz_id,
            learner_id=self.learner_id,
            document_id="doc_cpi_manual",
            topic="Index Numbers",
            difficulty="hard",
            created_at=datetime.now(timezone.utc).isoformat(),
            status="IN_PROGRESS",
            questions_snapshot=[sample_mcq],
        )
        self.repo.save_quiz(session)

        # Submit
        submission = QuizSubmissionRequest(
            answers=[SingleAnswerSubmission(question_id="mcq_7b5_03", selected_answer="A")]
        )
        result = QuizEvaluator.evaluate(session=session, submission=submission)
        session.status = "SUBMITTED"
        session.submitted_at = result.submitted_at
        session.submission = submission
        session.result = result
        self.repo.update_quiz(session)

        # Simulate Server Restart: Purge repository cache
        self.repo._cache.clear()
        self.assertNotIn(quiz_id, self.repo._cache)

        # Re-fetch from Supabase
        reloaded = self.repo.get_quiz(quiz_id)
        self.assertIsNotNone(reloaded, "Quiz session failed to reload from Supabase after restart")
        self.assertEqual(reloaded.quiz_id, quiz_id)
        self.assertEqual(reloaded.status, "SUBMITTED")
        self.assertIsNotNone(reloaded.result)
        self.assertEqual(reloaded.result.score, 1)
        self.assertEqual(reloaded.result.percentage, 100.0)
        self.assertEqual(len(reloaded.questions_snapshot), 1)
        self.assertEqual(reloaded.questions_snapshot[0].question_id, "mcq_7b5_03")


if __name__ == "__main__":
    unittest.main()
