from fastapi import APIRouter, HTTPException
from models.document import AITestRequest, AITestResponse
from services.llm import get_llm_service

router = APIRouter(prefix="/ai", tags=["AI Engine"])

@router.post("/test", response_model=AITestResponse)
def test_ai_connection(request: AITestRequest):
    """Test LLM service connectivity (Gemini API or Mock Engine fallback)."""
    try:
        service = get_llm_service()
        prompt = request.prompt or "Test prompt for StatSaksham AI learning engine."
        result = service.test_connection(prompt)
        
        return AITestResponse(
            status=result.get("status", "success"),
            provider=result.get("provider", "Mock Service Provider"),
            is_mock=result.get("is_mock", True),
            response_text=result.get("response_text", ""),
            timestamp=result.get("timestamp", "")
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with LLM service: {str(e)}"
        )
