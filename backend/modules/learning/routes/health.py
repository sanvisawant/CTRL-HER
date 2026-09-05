from datetime import datetime
from fastapi import APIRouter
from config import settings
from models.document import HealthResponse
from services.llm import get_llm_service, MockLLMService

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def check_health():
    llm_service = get_llm_service()
    provider_name = "mock" if isinstance(llm_service, MockLLMService) else "gemini"

    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp=datetime.utcnow().isoformat(),
        llm_provider=provider_name
    )
