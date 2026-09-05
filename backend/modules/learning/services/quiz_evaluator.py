import logging
from datetime import datetime
from typing import Dict, List, Set, Optional
from models.assessment import (
    QuizSession,
    QuizSubmissionRequest,
    QuizResult,
    QuestionEvaluationResult,
    TopicPerformance
)

logger = logging.getLogger(__name__)

class QuizEvaluator:
    """
    Deterministic scoring and evaluation engine for learner quiz sessions.
    Zero LLM involvement; computes exact matches, topic-level metrics, and structured feedback.
    """

    @classmethod
    def evaluate(cls, session: QuizSession, submission: QuizSubmissionRequest) -> QuizResult:
        """
        Evaluates learner submissions against the quiz question snapshot.
        Raises ValueError on malformed, duplicate, or out-of-bounds question submissions.
        """
        snapshot_questions = session.questions_snapshot
        total_questions = len(snapshot_questions)
        if total_questions == 0:
            raise ValueError("Cannot evaluate a quiz session with zero questions.")

        snapshot_map = {q.question_id: q for q in snapshot_questions}
        valid_qids: Set[str] = set(snapshot_map.keys())

        # 1. Validate submission for duplicates and unknown question IDs
        seen_qids: Set[str] = set()
        submitted_answers_map: Dict[str, Optional[str]] = {}

        for ans in submission.answers:
            qid = ans.question_id.strip()
            if qid not in valid_qids:
                raise ValueError(f"Question '{qid}' does not belong to quiz '{session.quiz_id}'.")

            if qid in seen_qids:
                raise ValueError(f"Duplicate answer submitted for question '{qid}'.")

            seen_qids.add(qid)

            # Validate option choices
            sel = ans.selected_answer.strip().upper() if ans.selected_answer else None
            if sel and sel not in {"A", "B", "C", "D"}:
                raise ValueError(f"Invalid option choice '{sel}' for question '{qid}'. Must be A, B, C, or D.")

            submitted_answers_map[qid] = sel

        # 2. Evaluate each question against server-side snapshot
        question_results: List[QuestionEvaluationResult] = []
        topic_stats: Dict[str, Dict[str, int]] = {}

        for q in snapshot_questions:
            topic_name = q.topic or "General"
            if topic_name not in topic_stats:
                topic_stats[topic_name] = {"total": 0, "correct": 0, "incorrect": 0, "unanswered": 0}
            topic_stats[topic_name]["total"] += 1

            selected = submitted_answers_map.get(q.question_id)
            is_answered = bool(selected and selected.strip())
            is_correct = bool(is_answered and selected == q.correct_answer)

            if not is_answered:
                topic_stats[topic_name]["unanswered"] += 1
            elif is_correct:
                topic_stats[topic_name]["correct"] += 1
            else:
                topic_stats[topic_name]["incorrect"] += 1

            question_results.append(QuestionEvaluationResult(
                question_id=q.question_id,
                question=q.question,
                options=q.options,
                selected_answer=selected,
                correct_answer=q.correct_answer,
                is_correct=is_correct,
                explanation=q.explanation,
                difficulty=q.difficulty,
                topic=topic_name,
                source=q.source
            ))

        # 3. Overall performance metrics
        answered_questions = sum(1 for r in question_results if r.selected_answer is not None)
        correct_answers = sum(1 for r in question_results if r.is_correct)
        incorrect_answers = answered_questions - correct_answers
        unanswered_questions = total_questions - answered_questions
        score = correct_answers
        percentage = round((correct_answers / total_questions) * 100.0, 1)

        # 4. Topic performance breakdowns
        topic_performance_list: List[TopicPerformance] = []
        for tname, stats in topic_stats.items():
            t_total = stats["total"]
            t_corr = stats["correct"]
            acc = round((t_corr / t_total) * 100.0, 1) if t_total > 0 else 0.0
            topic_performance_list.append(TopicPerformance(
                topic=tname,
                questions=t_total,
                correct=t_corr,
                incorrect=stats["incorrect"],
                unanswered=stats["unanswered"],
                accuracy=acc
            ))

        # Sort topics by accuracy descending
        topic_performance_list.sort(key=lambda x: x.accuracy, reverse=True)

        strongest_topic = topic_performance_list[0].topic if topic_performance_list else None
        # Weakest topic is the lowest accuracy topic with accuracy < 100%
        weakest_candidate = topic_performance_list[-1] if topic_performance_list else None
        weakest_topic = weakest_candidate.topic if (weakest_candidate and weakest_candidate.accuracy < 100.0) else None

        # 5. Deterministic overall feedback
        feedback = cls._generate_feedback(percentage)

        return QuizResult(
            quiz_id=session.quiz_id,
            learner_id=session.learner_id,
            document_id=session.document_id,
            total_questions=total_questions,
            answered_questions=answered_questions,
            correct_answers=correct_answers,
            incorrect_answers=incorrect_answers,
            unanswered_questions=unanswered_questions,
            score=score,
            percentage=percentage,
            question_results=question_results,
            topic_performance=topic_performance_list,
            strongest_topic=strongest_topic,
            weakest_topic=weakest_topic,
            overall_feedback=feedback,
            submitted_at=datetime.utcnow().isoformat()
        )

    @staticmethod
    def _generate_feedback(percentage: float) -> str:
        if percentage >= 90.0:
            return "Excellent performance. You demonstrated strong understanding of this material."
        elif percentage >= 75.0:
            return "Good performance. Review the concepts you missed to strengthen your understanding."
        elif percentage >= 50.0:
            return "You have a developing understanding. Focus on the weaker concepts and practice them again."
        else:
            return "Several concepts need review. We recommend revisiting the learning material before attempting another assessment."

    @staticmethod
    def select_weakest_answered_topic(topic_performance: List[TopicPerformance]) -> Optional[tuple[str, float]]:
        """
        Identifies the weakest topic among topics where the learner actually answered at least 1 question.
        Ignores topics where all questions were skipped/unanswered.
        Returns (topic_name, accuracy) or None if no questions were answered.
        """
        answered_topics = [
            tp for tp in topic_performance
            if (tp.correct + tp.incorrect) > 0
        ]
        if not answered_topics:
            return None

        # Sort primarily by lowest accuracy, secondarily by highest incorrect count
        answered_topics.sort(key=lambda tp: (tp.accuracy, -tp.incorrect))
        weakest = answered_topics[0]
        return weakest.topic, weakest.accuracy

    @staticmethod
    def calculate_adaptive_difficulty(accuracy: float) -> str:
        """
        Calculates adaptive practice difficulty based on the learner's weak topic accuracy:
          < 50% -> easy
          50% to < 80% -> medium
          80%+ -> hard
        """
        if accuracy < 50.0:
            return "easy"
        elif accuracy < 80.0:
            return "medium"
        else:
            return "hard"

