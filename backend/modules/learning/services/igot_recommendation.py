from typing import List

from integrations.igot.adapter import MockIGOTAdapter


class IGOTRecommendationService:

    def __init__(self):
        self.igot = MockIGOTAdapter()

    @staticmethod
    def _normalise(value: str) -> str:
        return value.strip().lower()

    def recommend_courses(
        self,
        learner_id: str,
        skill_gaps: List[str],
        role: str | None = None,
        limit: int = 5
    ):

        courses = self.igot.get_courses()

        normalized_gaps = {
            self._normalise(skill)
            for skill in skill_gaps
            if skill.strip()
        }

        recommendations = []

        for course in courses:

            course_competencies = {
                self._normalise(skill)
                for skill in course["competencies"]
            }

            matched = normalized_gaps.intersection(
                course_competencies
            )

            missing = normalized_gaps.difference(
                course_competencies
            )

            if normalized_gaps:
                match_percentage = (
                    len(matched) / len(normalized_gaps)
                ) * 100
            else:
                match_percentage = 0

            role_bonus = 0

            if role:
                normalized_role = self._normalise(role)

                target_roles = {
                    self._normalise(r)
                    for r in course["target_roles"]
                }

                if normalized_role in target_roles:
                    role_bonus = 10

            final_score = min(
                100,
                round(match_percentage + role_bonus, 2)
            )

            if matched or role_bonus > 0:

                reason_parts = []

                if matched:
                    reason_parts.append(
                        f"Matches {len(matched)} of your skill gaps"
                    )

                if role_bonus:
                    reason_parts.append(
                        "aligned with your role"
                    )

                recommendations.append({
                    "course_id": course["id"],
                    "title": course["title"],
                    "description": course["description"],
                    "competencies": course["competencies"],
                    "difficulty": course["difficulty"],
                    "duration_hours": course["duration_hours"],
                    "target_roles": course["target_roles"],
                    "match_percentage": final_score,
                    "matched_competencies": list(matched),
                    "missing_competencies": list(missing),
                    "reason": ", ".join(reason_parts),
                    "url": course["url"]
                })

        recommendations.sort(
            key=lambda x: x["match_percentage"],
            reverse=True
        )

        return {
            "learner_id": learner_id,
            "skill_gaps": skill_gaps,
            "recommendations": recommendations[:limit]
        }