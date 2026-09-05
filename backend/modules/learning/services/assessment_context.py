import logging
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pathlib import Path
from config import settings
from services.embedding_service import get_embedding_service
from services.vector_store import get_vector_store

logger = logging.getLogger(__name__)

# Minimum word threshold to consider content viable for grounded MCQ generation
MIN_WORDS_FOR_ASSESSMENT = 30

@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    source: str
    location: Optional[str]
    locations: List[str]
    text: str
    chunk_index: int
    score: Optional[float] = None

@dataclass
class AssessmentContext:
    document_id: str
    document_name: str
    chunks: List[RetrievedChunk]
    formatted_context: str
    total_words: int
    is_sufficient: bool
    topic: Optional[str] = None

class AssessmentContextService:
    """
    Prepares bounded, deduplicated, and source-grounded context blocks for LLM assessment generation.
    Reuses existing VectorStore and EmbeddingService.
    """

    def __init__(self):
        self.vector_store = get_vector_store()
        self.embedding_service = get_embedding_service()

    def build_context(
        self,
        document_id: str,
        topic: Optional[str] = None,
        count: int = 5
    ) -> AssessmentContext:
        """
        Retrieves relevant chunks and formats them into a strictly bounded, source-attributed context.
        """
        self.vector_store._ensure_loaded()
        
        # Calculate how many chunks to retrieve based on question count
        target_k = min(max(count * 2, 4), 15)

        raw_chunks: List[RetrievedChunk] = []
        clean_topic = topic.strip() if topic and topic.strip() else None

        if clean_topic:
            # 1. Topic-driven semantic retrieval using FAISS
            try:
                query_vec = self.embedding_service.embed_text(clean_topic)
                search_results = self.vector_store.search(
                    query_vector=query_vec,
                    top_k=target_k,
                    document_id=document_id
                )
                for r in search_results:
                    raw_chunks.append(RetrievedChunk(
                        chunk_id=r["chunk_id"],
                        document_id=r["document_id"],
                        source=r["source"],
                        location=r.get("location"),
                        locations=r.get("locations", []),
                        text=r["text"],
                        chunk_index=r.get("chunk_index", 0),
                        score=r.get("score")
                    ))
            except Exception as e:
                logger.warning(f"Semantic search failed for topic '{clean_topic}': {e}. Falling back to document chunks.")

        # 2. If no topic or semantic search returned too few chunks, fill from document index items
        if len(raw_chunks) < target_k:
            existing_ids = {c.chunk_id for c in raw_chunks}
            doc_items = [
                item for item in self.vector_store._metadata.get("items", [])
                if item.get("document_id") == document_id
            ]

            # If not in vector store items, check chunks from documents route / disk
            if not doc_items:
                try:
                    from routes.documents import _load_chunks_json
                    loaded_chunks = _load_chunks_json(document_id)
                    doc_items = [c.model_dump() for c in loaded_chunks]
                except Exception as err:
                    logger.warning(f"Failed to load chunks for {document_id}: {err}")

            # Stratified/diverse selection across document order
            for item in doc_items:
                cid = item.get("chunk_id", "")
                if cid and cid not in existing_ids:
                    raw_chunks.append(RetrievedChunk(
                        chunk_id=cid,
                        document_id=item.get("document_id", document_id),
                        source=item.get("source", "Document"),
                        location=item.get("location"),
                        locations=item.get("locations", [item.get("location")] if item.get("location") else []),
                        text=item.get("text", ""),
                        chunk_index=item.get("chunk_index", len(raw_chunks)),
                        score=None
                    ))
                    existing_ids.add(cid)
                    if len(raw_chunks) >= target_k:
                        break

        # Deduplicate chunks while preserving retrieval order
        unique_chunks: List[RetrievedChunk] = []
        seen_ids = set()
        for chunk in raw_chunks:
            if chunk.chunk_id not in seen_ids and chunk.text.strip():
                seen_ids.add(chunk.chunk_id)
                unique_chunks.append(chunk)

        # Determine document name
        document_name = unique_chunks[0].source if unique_chunks else "Learning Document"

        # Calculate word volume
        total_words = sum(len(c.text.split()) for c in unique_chunks)
        is_sufficient = len(unique_chunks) > 0 and total_words >= MIN_WORDS_FOR_ASSESSMENT

        # Build formatted context block
        formatted_blocks = []
        for c in unique_chunks:
            loc = c.locations[0] if c.locations else (c.location or "General")
            block = (
                f"SOURCE: {c.source}\n"
                f"LOCATION: {loc}\n"
                f"CHUNK: {c.chunk_id}\n\n"
                f"CONTENT:\n{c.text.strip()}"
            )
            formatted_blocks.append(block)

        formatted_context = "\n\n----------------------------------------\n\n".join(formatted_blocks)

        return AssessmentContext(
            document_id=document_id,
            document_name=document_name,
            chunks=unique_chunks,
            formatted_context=formatted_context,
            total_words=total_words,
            is_sufficient=is_sufficient,
            topic=clean_topic
        )

# Module-level singleton
_context_service: Optional[AssessmentContextService] = None

def get_assessment_context_service() -> AssessmentContextService:
    global _context_service
    if _context_service is None:
        _context_service = AssessmentContextService()
    return _context_service
