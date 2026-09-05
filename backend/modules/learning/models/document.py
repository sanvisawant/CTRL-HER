from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    project: str = Field(...)
    version: str = Field(...)
    timestamp: str = Field(...)
    llm_provider: str = Field(..., example="gemini" or "mock")

class AITestRequest(BaseModel):
    prompt: Optional[str] = Field(default="Hello, test the connection to StatSaksham AI LLM engine.")

class AITestResponse(BaseModel):
    status: str = Field(..., example="success")
    provider: str = Field(..., example="Gemini 2.5 Flash" or "Mock Service Provider")
    is_mock: bool = Field(...)
    response_text: str = Field(...)
    timestamp: str = Field(...)

class ExtractedBlock(BaseModel):
    document_id: str
    source: str
    location: Optional[str] = Field(None, example="Page 1" or "Slide 3")
    text: str

class DocumentChunk(BaseModel):
    chunk_id: str = Field(..., example="doc_001_chunk_001")
    document_id: str
    chunk_index: int
    text: str
    source: str
    location: Optional[str] = Field(None, example="Page 1")
    locations: List[str] = Field(default_factory=list, example=["Page 1", "Page 2"])
    word_count: int

class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    file_size_formatted: str
    uploaded_at: str
    status: str = Field(..., example="EMBEDDED" or "CHUNKED" or "TEXT_EXTRACTED" or "FAILED")
    pages: int = Field(default=0)
    text_blocks: int = Field(default=0)
    chunks: int = Field(default=0)
    embeddings: int = Field(default=0)
    description: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    data: DocumentMetadata

class DocumentListResponse(BaseModel):
    total: int
    documents: List[DocumentMetadata]

class DocumentPreviewResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    pages: int
    text_blocks: int
    content: List[ExtractedBlock]

class DocumentChunksResponse(BaseModel):
    document_id: str
    filename: str
    chunk_count: int
    chunks: List[DocumentChunk]

class DocumentStatusResponse(BaseModel):
    document_id: str
    status: str
    progress: int
    pages: int
    text_blocks: int
    chunks: int
    embeddings: int = Field(default=0)
    embedding_dimension: int = Field(default=0)

class EmbedResponse(BaseModel):
    document_id: str
    status: str
    chunks_embedded: int
    embedding_dimension: int
    embedding_model: str
    skipped: bool = False

class IndexResponse(BaseModel):
    document_id: str
    status: str
    chunks_indexed: int
    total_vectors: int
    embedding_dimension: int
    skipped: bool = False

class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    score: float
    text: str
    source: str
    location: Optional[str] = None
    locations: List[str] = Field(default_factory=list)
    chunk_index: int

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    document_id: Optional[str] = Field(default=None)

class SearchResponse(BaseModel):
    query: str
    top_k: int
    total_results: int
    results: List[SearchResultItem]
