"""
Phase 3F — RAG Learning Assistant Service

Sits on top of the existing EmbeddingService + VectorStore retrieval layer.
Does NOT duplicate semantic search logic.
"""
import logging
import json
from typing import List, Optional

logger = logging.getLogger(__name__)

# Minimum words in retrieved context before we attempt LLM generation
_MIN_CONTEXT_WORDS = 40

# Similarity score threshold — chunks below this are considered low-quality
_MIN_SCORE_THRESHOLD = 0.15

# Maximum characters sent to the LLM (prevents token overflow)
_MAX_CONTEXT_CHARS = 8000


class RAGAssistantService:
    """
    Retrieval-Augmented Generation service for grounded learning material Q&A.
    Reuses EmbeddingService and VectorStore; never duplicates their logic.
    """

    def __init__(self):
        from services.embedding_service import get_embedding_service
        from services.vector_store import get_vector_store
        from services.llm import get_llm_service

        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()
        self.llm_service = get_llm_service()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def answer(
        self,
        question: str,
        document_id: Optional[str] = None,
        top_k: int = 5
    ) -> dict:
        """
        Full RAG pipeline:
          1. Validate question
          2. Embed question
          3. Semantic retrieval (optionally filtered to one document)
          4. Deduplicate & quality-filter chunks
          5. Build bounded context
          6. Generate grounded answer via LLM
          7. Parse & validate response
          8. Return answer + source metadata
        """
        question = question.strip()
        if not question:
            return self._insufficient_context_response(question, "Question is empty.")

        # 1. Check index is populated
        if self.vector_store.total_vectors == 0:
            return {
                "status": "NO_INDEX",
                "question": question,
                "answer": "No learning material has been indexed yet. Please upload a document, generate embeddings, and build the search index first.",
                "confidence": "LOW",
                "sources": [],
            }

        # 2. Embed question
        try:
            query_vec = self.embedding_service.embed_text(question)
        except Exception as e:
            logger.warning(f"Failed to embed question: {e}")
            return self._insufficient_context_response(question, "Failed to embed question.")

        # 3. Retrieve chunks
        try:
            raw_results = self.vector_store.search(
                query_vector=query_vec,
                top_k=min(top_k * 2, 20),  # over-fetch then filter
                document_id=document_id,
            )
        except Exception as e:
            logger.warning(f"Vector store search failed: {e}")
            return self._insufficient_context_response(question, "Retrieval failed.")

        # 4. Quality-filter and deduplicate
        chunks = self._filter_and_deduplicate(raw_results, top_k)

        if not chunks:
            return self._insufficient_context_response(
                question,
                "No relevant content found in the indexed learning material for this question."
            )

        # 5. Build bounded context string
        context_str, total_words = self._build_context(chunks)

        if total_words < _MIN_CONTEXT_WORDS:
            return self._insufficient_context_response(
                question,
                "The retrieved context is too short to generate a reliable answer."
            )

        # 6. Generate grounded answer via LLM
        raw_answer = self._generate_with_llm(question, context_str)

        # 7. Parse JSON response from LLM
        parsed = self._parse_llm_response(raw_answer, question, chunks)

        return parsed

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _filter_and_deduplicate(
        self, raw_results: List[dict], top_k: int
    ) -> List[dict]:
        """Remove low-score duplicates; keep top_k best chunks."""
        seen_ids = set()
        filtered = []
        for r in raw_results:
            score = r.get("score", 0.0)
            cid = r.get("chunk_id", "")
            if score < _MIN_SCORE_THRESHOLD:
                continue
            if cid in seen_ids:
                continue
            seen_ids.add(cid)
            filtered.append(r)
            if len(filtered) >= top_k:
                break
        return filtered

    def _build_context(self, chunks: List[dict]) -> tuple[str, int]:
        """Build a formatted, bounded context string from retrieved chunks."""
        blocks = []
        total_chars = 0
        total_words = 0

        for c in chunks:
            text = c.get("text", "").strip()
            if not text:
                continue
            loc = (c.get("locations") or [c.get("location")] or ["General"])[0]
            block = (
                f"SOURCE: {c.get('source', 'Document')}\n"
                f"LOCATION: {loc}\n"
                f"CHUNK: {c.get('chunk_id', '')}\n\n"
                f"CONTENT:\n{text}"
            )
            if total_chars + len(block) > _MAX_CONTEXT_CHARS:
                break
            blocks.append(block)
            total_chars += len(block)
            total_words += len(text.split())

        return "\n\n" + "─" * 40 + "\n\n".join(blocks), total_words

    def _generate_with_llm(self, question: str, context_str: str) -> str:
        """Send a strictly grounded prompt to the LLM and return raw text."""
        prompt = f"""You are a grounded learning assistant for India's Official Statistical System (MoSPI).

A learner has asked a question. You must answer ONLY using the learning material context provided below.

STRICT GROUNDING RULES:
1. Answer ONLY from the provided CONTEXT blocks. Do not use outside knowledge.
2. Do not invent facts, numbers, or definitions not present in the context.
3. If the context does not contain enough information to answer, say so explicitly.
4. Preserve statistical terminology, formulas, and numbers exactly as they appear.
5. Do not fabricate citations or chunk references.
6. Provide a clear, concise explanation suitable for a government statistics trainee.
7. Return ONLY a valid JSON object. No markdown fences, no conversational text.

OUTPUT FORMAT (valid JSON object):
{{
  "answer": "Your grounded answer here...",
  "confidence": "HIGH",
  "chunk_ids_used": ["chunk_id_1", "chunk_id_2"]
}}

confidence must be one of: "HIGH" (context clearly answers the question), "MEDIUM" (context partially answers), "LOW" (context is tangentially related).

LEARNER QUESTION:
{question}

LEARNING MATERIAL CONTEXT:
{context_str}
"""
        try:
            raw = self.llm_service.generate_text(prompt)
            return raw
        except Exception as e:
            logger.warning(f"LLM generation failed: {e}")
            return ""

    def _parse_llm_response(
        self, raw: str, question: str, chunks: List[dict]
    ) -> dict:
        """
        Parse the LLM JSON response and attach source metadata.
        Falls back to an insufficient-context response if parsing fails.
        """
        # Try to extract JSON from the raw string
        clean = raw.strip() if raw else ""
        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0].strip()
        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0].strip()

        # Find the first { ... } JSON object
        start = clean.find("{")
        end = clean.rfind("}") + 1
        if start >= 0 and end > start:
            clean = clean[start:end]

        try:
            data = json.loads(clean)
        except (json.JSONDecodeError, ValueError):
            logger.warning(f"Could not parse LLM JSON response. Raw: {raw[:200]}")
            return self._insufficient_context_response(question, "LLM returned unparseable response.")

        answer_text = data.get("answer", "").strip()
        confidence = data.get("confidence", "MEDIUM").upper()
        if confidence not in {"HIGH", "MEDIUM", "LOW"}:
            confidence = "MEDIUM"

        # Guard against template placeholder text from prompt instructions
        if not answer_text or answer_text.strip().lower() in {
            "your grounded answer here...",
            "your grounded answer here",
            "[mock llm response]",
        }:
            logger.warning("LLM response contained dummy placeholder answer text; falling back to grounded chunk synthesis.")
            synthesized = self._fallback_summarize_chunks(question, chunks)
            if synthesized:
                answer_text = synthesized
                confidence = "MEDIUM"
            else:
                return self._insufficient_context_response(question, "LLM returned placeholder answer.")

        # Check for explicit insufficient-context signal in the answer
        insufficient_phrases = [
            "cannot be determined", "not enough information",
            "not found in", "cannot find", "does not contain",
            "no information", "cannot determine from"
        ]
        if any(p in answer_text.lower() for p in insufficient_phrases):
            confidence = "LOW"

        # Build source list from chunks used (or all retrieved chunks)
        chunk_ids_used = set(data.get("chunk_ids_used", []))
        sources = []
        seen = set()
        for c in chunks:
            cid = c.get("chunk_id", "")
            if cid in seen:
                continue
            # Include if explicitly cited, or if no specific citations given
            if not chunk_ids_used or cid in chunk_ids_used:
                seen.add(cid)
                loc = (c.get("locations") or [c.get("location")])[0] if (c.get("locations") or c.get("location")) else None
                sources.append({
                    "document_id": c.get("document_id", ""),
                    "document": c.get("source", ""),
                    "chunk_id": cid,
                    "location": loc,
                })

        # If LLM cited non-matching or abbreviated chunk IDs, fall back to top retrieved chunks
        if not sources and chunks:
            for c in chunks[:3]:
                cid = c.get("chunk_id", "")
                loc = (c.get("locations") or [c.get("location")])[0] if (c.get("locations") or c.get("location")) else None
                sources.append({
                    "document_id": c.get("document_id", ""),
                    "document": c.get("source", ""),
                    "chunk_id": cid,
                    "location": loc,
                })

        status = "ANSWERED" if confidence in {"HIGH", "MEDIUM"} else "INSUFFICIENT_CONTEXT"

        return {
            "status": status,
            "question": question,
            "answer": answer_text,
            "confidence": confidence,
            "sources": sources,
        }

    def _fallback_summarize_chunks(self, question: str, chunks: List[dict]) -> Optional[str]:
        """Extract substantive factual lines from retrieved chunks as fallback."""
        if not chunks:
            return None
        import re
        q_words = [w.lower() for w in re.findall(r"\w+", question) if len(w) > 3 and w.lower() not in {"what", "which", "explain", "describe", "about"}]
        matches = []
        for c in chunks:
            text = c.get("text", "")
            for line in text.split("\n"):
                line = line.strip()
                if len(line) > 30 and any(qw in line.lower() for qw in q_words):
                    matches.append(line)
                    if len(matches) >= 3:
                        break
            if len(matches) >= 3:
                break
        if matches:
            return " ".join(matches)

        for c in chunks:
            text = c.get("text", "").strip()
            if len(text) > 40:
                first_para = text.split("\n\n")[0].strip()
                return first_para[:500]
        return None

    def _insufficient_context_response(self, question: str, _reason: str = "") -> dict:
        """Standard insufficient-context response — never hallucinates."""
        logger.info(f"Insufficient context for question: '{question[:60]}'. Reason: {_reason}")
        return {
            "status": "INSUFFICIENT_CONTEXT",
            "question": question,
            "answer": "I could not find enough information about this topic in the uploaded learning material. Please ensure the relevant document has been indexed, or try rephrasing your question.",
            "confidence": "LOW",
            "sources": [],
        }


# Module-level singleton
_rag_service: Optional[RAGAssistantService] = None


def get_rag_assistant_service() -> RAGAssistantService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGAssistantService()
    return _rag_service
