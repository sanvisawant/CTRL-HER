import logging
from typing import Optional, Tuple, Dict, List
from config import settings
from models.learner_progress import LearnerTopicProgress, LearnerProgressProfile
from models.recommendation import PersonalizedRecommendation
from services.learner_progress_repository import (
    get_learner_progress_repository,
    LearnerProgressRepository
)
from services.quiz_repository import get_quiz_repository, QuizRepository

logger = logging.getLogger(__name__)

class PersonalizedLearningService:
    """
    Deterministic personalization service for StatSaksham AI.
    Consumes accumulated learner progress data to prioritize topics and prescribe next learning steps.
    """

    def __init__(
        self,
        progress_repo: Optional[LearnerProgressRepository] = None,
        quiz_repo: Optional[QuizRepository] = None
    ):
        self.progress_repo = progress_repo or get_learner_progress_repository()
        self.quiz_repo = quiz_repo or get_quiz_repository()

    def get_recommendation(self, learner_id: str) -> PersonalizedRecommendation:
        """
        Determines the learner's single highest-priority learning recommendation based on
        longitudinal progress history.
        """
        profile = self.progress_repo.get_progress(learner_id)

        # 1. Check if learner has any tracked topics
        if not profile.topics or profile.total_tracked_topics == 0:
            return PersonalizedRecommendation(
                status="NO_PROGRESS",
                learner_id=learner_id,
                reason="No assessment performance history is recorded yet for this learner profile.",
                next_step="Complete an initial assessment quiz to receive personalized learning recommendations."
            )

        # 2. Check if all topics are already MASTERED
        all_mastered = all(tp.status == "MASTERED" for tp in profile.topics.values())
        if all_mastered and len(profile.topics) > 0:
            return PersonalizedRecommendation(
                status="ALL_MASTERED",
                learner_id=learner_id,
                reason="All currently tracked topics meet the official statistical mastery threshold.",
                next_step="Advance to new learning materials and modules."
            )

        # 3. Calculate priority scores for each tracked topic
        scored_topics: List[Tuple[float, LearnerTopicProgress]] = []
        for topic_name, tp in profile.topics.items():
            score = self.calculate_topic_priority(tp)
            scored_topics.append((score, tp))

        # Sort descending by priority score (highest score = highest priority for intervention)
        scored_topics.sort(key=lambda item: item[0], reverse=True)
        top_score, top_topic = scored_topics[0]

        # 4. Determine prescriptive action, deterministic reason, and next step
        action, reason, next_step = self.determine_action(top_topic)

        # 5. Resolve source document ID from learner's quiz history
        doc_id = self._resolve_document_for_topic(top_topic, learner_id)

        return PersonalizedRecommendation(
            status="RECOMMENDED",
            learner_id=learner_id,
            recommended_topic=top_topic.topic,
            action=action,
            priority_score=top_score,
            topic_status=top_topic.status,
            accuracy=top_topic.accuracy,
            recent_accuracy=top_topic.recent_accuracy,
            trend=top_topic.trend,
            reason=reason,
            next_step=next_step,
            document_id=doc_id
        )

    @staticmethod
    def calculate_topic_priority(topic: LearnerTopicProgress) -> float:
        """
        Computes a deterministic priority score where higher values denote greater urgency.
        Weighs recent accuracy (70%) and performance trend higher than overall historical accuracy.
        """
        # Base deficit derived from error rates:
        accuracy_deficit = (100.0 - topic.recent_accuracy) * 0.70 + (100.0 - topic.accuracy) * 0.30

        # Status bonus / penalty
        status_bonus = {
            "NEEDS_REVIEW": 35.0,
            "LEARNING": 15.0,
            "IMPROVING": 5.0,
            "MASTERED": -50.0  # Heavily deprioritize mastered topics to prevent loops
        }.get(topic.status, 0.0)

        # Trend bonus / penalty
        trend_bonus = {
            "DECLINING": 20.0,
            "INSUFFICIENT_DATA": 10.0,
            "STABLE": 0.0,
            "IMPROVING": -15.0
        }.get(topic.trend, 0.0)

        total_score = accuracy_deficit + status_bonus + trend_bonus
        return round(total_score, 2)

    @staticmethod
    def determine_action(topic: LearnerTopicProgress) -> Tuple[str, str, str]:
        """
        Prescribes the recommended action (REVIEW, PRACTICE, REASSESS, ADVANCE)
        and returns explainable rule-based reasons without calling an LLM.
        """
        if topic.status == "NEEDS_REVIEW":
            if topic.recent_accuracy < 40.0:
                action = "REVIEW"
                reason = (
                    f"Recent performance on '{topic.topic}' is critically low ({topic.recent_accuracy}%) "
                    f"and performance trend is {topic.trend.lower()}."
                )
                next_step = f"Review foundational reference materials on {topic.topic} before attempting another quiz."
            else:
                action = "PRACTICE"
                reason = (
                    f"Recent accuracy on '{topic.topic}' is below target ({topic.recent_accuracy}%). "
                    f"Targeted practice is required to address knowledge gaps."
                )
                next_step = f"Practice targeted questions on {topic.topic} to build competency."
        elif topic.status == "LEARNING":
            action = "PRACTICE"
            reason = (
                f"Topic '{topic.topic}' is currently in progress with {topic.recent_accuracy}% recent accuracy. "
                f"Continued practice will develop solid baseline understanding."
            )
            next_step = f"Practice targeted questions on {topic.topic}."
        elif topic.status == "IMPROVING":
            if topic.recent_accuracy >= 70.0:
                action = "REASSESS"
                reason = (
                    f"Performance on '{topic.topic}' shows strong improvement ({topic.recent_accuracy}% recent accuracy). "
                    f"A reassessment will verify readiness for full mastery."
                )
                next_step = f"Take a reassessment quiz on {topic.topic} to achieve mastery status."
            else:
                action = "PRACTICE"
                reason = (
                    f"Performance on '{topic.topic}' is steadily improving ({topic.recent_accuracy}%). "
                    f"Further practice will push it towards official mastery threshold."
                )
                next_step = f"Practice questions on {topic.topic} to sustain upward momentum."
        else:  # MASTERED
            action = "ADVANCE"
            reason = (
                f"Official mastery achieved on '{topic.topic}' with {topic.recent_accuracy}% recent accuracy "
                f"over {topic.attempts} attempts."
            )
            next_step = "Advance to new learning materials and modules."

        return action, reason, next_step

    def _resolve_document_for_topic(self, topic: LearnerTopicProgress, learner_id: str) -> Optional[str]:
        """
        Traces back through the learner's quiz attempt history to determine which document
        contained questions on this topic.
        """
        for entry in reversed(topic.history):
            quiz = self.quiz_repo.get_quiz(entry.quiz_id)
            if quiz and quiz.document_id:
                return quiz.document_id

        # Fallback: check any quiz associated with this learner
        for cached_quiz in self.quiz_repo._cache.values():
            if cached_quiz.learner_id == learner_id and cached_quiz.document_id:
                return cached_quiz.document_id

        return None


# Module-level singleton
_personalized_service: Optional[PersonalizedLearningService] = None

def get_personalized_learning_service() -> PersonalizedLearningService:
    global _personalized_service
    if _personalized_service is None:
        _personalized_service = PersonalizedLearningService()
    return _personalized_service
