"""
POST /api/search — Semantic Retrieval
Phase 2C-2: pure retrieval, no LLM, no answer generation.
"""
import logging
from fastapi import APIRouter, HTTPException, status
from config import settings
from models.document import SearchRequest, SearchResponse, SearchResultItem
from services.embedding_service import get_embedding_service
from services.vector_store import get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Semantic Search"])


@router.post("", response_model=SearchResponse)
def semantic_search(request: SearchRequest):
    """
    Embed the query and retrieve the top-K most similar chunks from the
    FAISS index.  Optionally filter to a single document.

    Validation rules enforced:
      - query must be non-empty (Pydantic min_length=1)
      - top_k must be 1–20 (Pydantic ge/le)
      - index must be loaded and non-empty
      - every FAISS result position must map to valid metadata
    """
    query = request.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query cannot be empty or whitespace."
        )

    top_k = min(request.top_k, settings.SEARCH_TOP_K_MAX)

    vs = get_vector_store()
    if vs.total_vectors == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "The search index is empty. "
                "Upload a document, generate embeddings, and index it first."
            )
        )

    # Validate document filter exists in index (if provided)
    if request.document_id and request.document_id not in vs.indexed_documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Document '{request.document_id}' is not in the search index. "
                "Run /index on this document first."
            )
        )

    # Embed the query using the same model as the indexed documents
    try:
        emb_service = get_embedding_service()
        query_vector = emb_service.embed_text(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to embed search query: {str(e)}"
        )

    # Run FAISS search
    try:
        raw_results = vs.search(
            query_vector=query_vector,
            top_k=top_k,
            document_id=request.document_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

    results = [
        SearchResultItem(
            chunk_id=r["chunk_id"],
            document_id=r["document_id"],
            score=r["score"],
            text=r["text"],
            source=r["source"],
            location=r.get("location"),
            locations=r.get("locations", []),
            chunk_index=r.get("chunk_index", 0),
        )
        for r in raw_results
    ]

    return SearchResponse(
        query=query,
        top_k=top_k,
        total_results=len(results),
        results=results
    )
