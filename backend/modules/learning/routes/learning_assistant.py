"""
Phase 3F — Learning Assistant API Route
POST /api/learning-assistant/ask
"""
from fastapi import APIRouter, HTTPException, status
from models.assistant import LearningAssistantRequest, LearningAssistantResponse, LearningAssistantSource
from services.rag_assistant import get_rag_assistant_service

router = APIRouter(prefix="/learning-assistant", tags=["Learning Assistant"])


@router.post(
    "/ask",
    response_model=LearningAssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a grounded question about indexed learning material"
)
def ask_learning_assistant(request: LearningAssistantRequest):
    """
    RAG-powered learning assistant.
    Retrieves relevant chunks from the FAISS index, then uses the configured
    LLM to generate an answer grounded strictly in the retrieved content.
    Returns source provenance with every answer.
    """
    svc = get_rag_assistant_service()

    result = svc.answer(
        question=request.question,
        document_id=request.document_id,
        top_k=request.top_k,
    )

    sources = [
        LearningAssistantSource(
            document_id=s["document_id"],
            document=s["document"],
            chunk_id=s["chunk_id"],
            location=s.get("location"),
        )
        for s in result.get("sources", [])
    ]

    return LearningAssistantResponse(
        status=result["status"],
        question=result["question"],
        answer=result["answer"],
        confidence=result["confidence"],
        sources=sources,
    )
