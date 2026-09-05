from .mock_data import COURSES, USER_PROGRESS
from .mock_data import COURSES, USER_PROGRESS

class MockIGOTAdapter:
    """
    Mock adapter for iGOT integration.

    Later, this class can be replaced by a real iGOT API adapter
    without changing the frontend or recommendation logic.
    """

    def get_courses(self):
        return COURSES

    def get_course(self, course_id: str):
        for course in COURSES:
            if course["id"] == course_id:
                return course

        return None

    def get_user_progress(self, user_id: str):
        matching_progress = [
            item
            for item in USER_PROGRESS
            if item["user_id"] == user_id
        ]
        if matching_progress:
            return matching_progress

        # Reuse the mock fixture for authenticated demo users while preserving
        # their actual learner ID in the response.
        return [
            {**item, "user_id": user_id}
            for item in USER_PROGRESS
            if item["user_id"] == "U001"
        ]
    def get_course_progress(
        self,
        user_id: str,
        course_id: str
    ):
        for item in USER_PROGRESS:
            if (
                item["user_id"] == user_id
                and item["course_id"] == course_id
            ):
                return item

        return None