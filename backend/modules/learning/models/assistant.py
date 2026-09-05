"""
Phase 3F — Grounded RAG Learning Assistant Models
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class LearningAssistantRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=1000, description="The learner's natural-language question.")
    document_id: Optional[str] = Field(None, description="Optional document filter. If omitted, search spans all indexed material.")
    top_k: int = Field(5, ge=1, le=10, description="Number of chunks to retrieve for context.")


class LearningAssistantSource(BaseModel):
    document_id: str
    document: str
    chunk_id: str
    location: Optional[str] = None


class LearningAssistantResponse(BaseModel):
    status: str            # "ANSWERED" | "INSUFFICIENT_CONTEXT" | "NO_INDEX"
    question: str
    answer: str
    confidence: str        # "HIGH" | "MEDIUM" | "LOW"
    sources: List[LearningAssistantSource]
