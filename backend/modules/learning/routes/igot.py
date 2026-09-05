from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from integrations.igot.adapter import MockIGOTAdapter
from services.igot_recommendation import IGOTRecommendationService
from integrations.igot.adapter import MockIGOTAdapter

router = APIRouter(
    prefix="/api/igot",
    tags=["iGOT Integration"]
)

igot = MockIGOTAdapter()
recommendation_service = IGOTRecommendationService()


@router.get("/courses")
def get_courses():
    """
    Get available iGOT courses.
    Currently served through the mock iGOT adapter.
    """

    return {
        "source": "MOCK_IGOT",
        "total": len(igot.get_courses()),
        "courses": igot.get_courses()
    }


@router.get("/courses/{course_id}")
def get_course(course_id: str):
    """
    Get details of a single iGOT course.
    """

    course = igot.get_course(course_id)

    if course is None:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )

    return {
        "source": "MOCK_IGOT",
        "course": course
    }


@router.get("/users/{user_id}/progress")
def get_user_progress(user_id: str):
    """
    Get iGOT learning progress for a learner.
    """

    progress = igot.get_user_progress(user_id)

    return {
        "source": "MOCK_IGOT",
        "user_id": user_id,
        "progress": progress
    }


@router.get("/recommendations")
def get_recommendations(
    learner_id: str,
    skill_gaps: str = Query(
        ...,
        description="Comma-separated skill gaps"
    ),
    role: Optional[str] = None,
    limit: int = 5
):
    """
    Recommend iGOT courses according to learner skill gaps.
    """

    gaps = [
        skill.strip()
        for skill in skill_gaps.split(",")
        if skill.strip()
    ]

    if not gaps:
        raise HTTPException(
            status_code=400,
            detail="At least one skill gap is required"
        )

    return recommendation_service.recommend_courses(
        learner_id=learner_id,
        skill_gaps=gaps,
        role=role,
        limit=limit
    )