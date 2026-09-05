import logging
from datetime import datetime
from typing import List, Dict, Optional
from config import settings
from models.assessment import QuizResult
from models.learner_progress import (
    TopicAttemptHistory,
    LearnerTopicProgress,
    LearnerProgressProfile
)
from services.learner_progress_repository import (
    get_learner_progress_repository,
    LearnerProgressRepository
)

logger = logging.getLogger(__name__)

class LearnerProgressService:
    """
    Service responsible for maintaining persistent, longitudinal learner performance models.
    Automatically updates topic attempts, recent accuracy, trend, and mastery status from quiz results.
    """

    def __init__(self, repository: Optional[LearnerProgressRepository] = None):
        self.repository = repository or get_learner_progress_repository()

    def update_from_quiz_result(self, quiz_result: QuizResult, learner_id: str) -> LearnerProgressProfile:
        """
        Updates the learner's topic-level progress and overall mastery profile from a completed quiz submission.
        """
        profile = self.repository.get_progress(learner_id)
        submitted_at = quiz_result.submitted_at or datetime.utcnow().isoformat()

        for tp in quiz_result.topic_performance:
            # We track any topic that was presented in the quiz
            topic_name = tp.topic or "General"
            questions_in_quiz = tp.questions
            correct_in_quiz = tp.correct
            incorrect_in_quiz = tp.incorrect
            attempt_accuracy = tp.accuracy

            # Skip topics with 0 questions
            if questions_in_quiz == 0:
                continue

            # Retrieve existing progress or initialize new topic record
            if topic_name in profile.topics:
                topic_progress = profile.topics[topic_name]
            else:
                topic_progress = LearnerTopicProgress(
                    topic=topic_name,
                    attempts=0,
                    questions_attempted=0,
                    correct_answers=0,
                    incorrect_answers=0,
                    accuracy=0.0,
                    recent_accuracy=0.0,
                    status="LEARNING",
                    trend="INSUFFICIENT_DATA",
                    first_seen_at=submitted_at,
                    last_practiced_at=submitted_at,
                    history=[]
                )
                profile.topics[topic_name] = topic_progress

            # 1. Append attempt snapshot to bounded history
            attempt_entry = TopicAttemptHistory(
                quiz_id=quiz_result.quiz_id,
                accuracy=attempt_accuracy,
                questions=questions_in_quiz,
                correct=correct_in_quiz,
                incorrect=incorrect_in_quiz,
                timestamp=submitted_at
            )
            topic_progress.history.append(attempt_entry)
            
            # Bound history length to configured maximum
            max_history = getattr(settings, "MAX_TOPIC_HISTORY", 10)
            if len(topic_progress.history) > max_history:
                topic_progress.history = topic_progress.history[-max_history:]

            # 2. Update cumulative counters
            topic_progress.attempts += 1
            topic_progress.questions_attempted += questions_in_quiz
            topic_progress.correct_answers += correct_in_quiz
            topic_progress.incorrect_answers += incorrect_in_quiz
            topic_progress.last_practiced_at = submitted_at

            # Cumulative overall accuracy
            if topic_progress.questions_attempted > 0:
                topic_progress.accuracy = round(
                    (topic_progress.correct_answers / topic_progress.questions_attempted) * 100.0,
                    2
                )

            # 3. Calculate recent accuracy within sliding attempt window
            recent_window_size = getattr(settings, "RECENT_ATTEMPT_WINDOW", 3)
            recent_entries = topic_progress.history[-recent_window_size:]
            r_correct = sum(e.correct for e in recent_entries)
            r_questions = sum(e.questions for e in recent_entries)
            if r_questions > 0:
                topic_progress.recent_accuracy = round(
                    (r_correct / r_questions) * 100.0,
                    2
                )
            else:
                topic_progress.recent_accuracy = attempt_accuracy

            # 4. Classify learning trend
            topic_progress.trend = self.compute_trend(topic_progress.history)

            # 5. Classify topic mastery status
            topic_progress.status = self.compute_mastery(
                questions_attempted=topic_progress.questions_attempted,
                correct_answers=topic_progress.correct_answers,
                recent_accuracy=topic_progress.recent_accuracy,
                overall_accuracy=topic_progress.accuracy,
                attempts=topic_progress.attempts,
                trend=topic_progress.trend
            )

        # 6. Recompute profile summary statistics
        self._recompute_profile_summary(profile)

        # 7. Persist updated profile
        self.repository.save_progress(profile)
        logger.info(f"Updated learner progress for '{learner_id}' ({len(profile.topics)} topics).")

        return profile

    @staticmethod
    def compute_trend(history: List[TopicAttemptHistory]) -> str:
        """
        Determines the directional performance trend based on recent attempt history:
          - Fewer than 2 attempts -> INSUFFICIENT_DATA
          - Recent change > +5%   -> IMPROVING
          - Recent change < -5%   -> DECLINING
          - Within ±5%            -> STABLE
        """
        if len(history) < 2:
            return "INSUFFICIENT_DATA"

        if len(history) == 2:
            delta = history[-1].accuracy - history[-2].accuracy
        else:
            # Compare latest attempt against the mean of preceding attempts in recent window
            prev_entries = history[-3:-1]
            prev_mean = sum(e.accuracy for e in prev_entries) / len(prev_entries)
            delta = history[-1].accuracy - prev_mean

        if delta > 5.0:
            return "IMPROVING"
        elif delta < -5.0:
            return "DECLINING"
        else:
            return "STABLE"

    @staticmethod
    def compute_mastery(
        questions_attempted: int,
        correct_answers: int,
        recent_accuracy: float,
        overall_accuracy: float,
        attempts: int,
        trend: str
    ) -> str:
        """
        Classifies topic mastery state deterministically:
          - NEEDS_REVIEW: no questions answered or recent accuracy < 50%
          - MASTERED: recent accuracy >= 80% with at least 2 attempts
          - IMPROVING: trend is IMPROVING or recent accuracy > historical accuracy
          - LEARNING: baseline progressing
        """
        if questions_attempted == 0 or (correct_answers == 0 and recent_accuracy == 0.0):
            return "NEEDS_REVIEW"

        if recent_accuracy < 50.0:
            return "NEEDS_REVIEW"

        if recent_accuracy >= 80.0 and attempts >= 2:
            return "MASTERED"

        if trend == "IMPROVING" or (recent_accuracy > overall_accuracy and recent_accuracy >= 55.0):
            return "IMPROVING"

        return "LEARNING"

    @staticmethod
    def _recompute_profile_summary(profile: LearnerProgressProfile) -> None:
        """Updates aggregate counts across all tracked topics for the learner."""
        topics = profile.topics.values()
        profile.total_tracked_topics = len(topics)
        profile.mastered_topics = sum(1 for t in topics if t.status == "MASTERED")
        profile.topics_needing_review = sum(1 for t in topics if t.status == "NEEDS_REVIEW")
        profile.improving_topics = sum(1 for t in topics if t.status == "IMPROVING")

        total_attempted = sum(t.questions_attempted for t in topics)
        total_correct = sum(t.correct_answers for t in topics)
        if total_attempted > 0:
            profile.overall_accuracy = round((total_correct / total_attempted) * 100.0, 2)
        else:
            profile.overall_accuracy = 0.0


# Module-level singleton
_progress_service: Optional[LearnerProgressService] = None

def get_learner_progress_service() -> LearnerProgressService:
    global _progress_service
    if _progress_service is None:
        _progress_service = LearnerProgressService()
    return _progress_service
