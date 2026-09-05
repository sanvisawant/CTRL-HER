import re
import logging
from typing import List, Dict, Any, Tuple, Optional, Set
from models.assessment import MCQItem, MCQOption, MCQSource

logger = logging.getLogger(__name__)

class MCQValidator:
    """
    Deterministic validation engine for LLM-generated MCQs.
    Enforces structure, option integrity, answer correctness, duplicate prevention, and source attribution.
    """

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalizes text for duplicate detection (lowercase alphanumeric with single spaces)."""
        return re.sub(r"[^a-zA-Z0-9]+", " ", text.lower()).strip()

    @classmethod
    def validate_question(
        cls,
        q_data: Dict[str, Any],
        fallback_doc_id: str,
        fallback_doc_name: str,
        seen_questions: Set[str]
    ) -> Tuple[Optional[MCQItem], Optional[str]]:
        """
        Validates a single raw question dict.
        Returns (MCQItem, None) if valid, or (None, rejection_reason) if invalid.
        """
        # 1. Question existence & length
        question_text = str(q_data.get("question", "")).strip()
        if not question_text or len(question_text) < 5:
            return None, "Question text is missing or too short."

        # Duplicate question check
        norm_q = cls.normalize_text(question_text)
        if norm_q in seen_questions:
            return None, f"Duplicate question text: '{question_text}'"

        # 2. Options validation (must have exactly 4 valid options: A, B, C, D)
        raw_options = q_data.get("options", [])
        if not isinstance(raw_options, list) or len(raw_options) != 4:
            return None, f"Expected exactly 4 options, got {len(raw_options) if isinstance(raw_options, list) else 0}"

        validated_options: List[MCQOption] = []
        option_texts_seen: Set[str] = set()
        expected_ids = ["A", "B", "C", "D"]

        for idx, opt in enumerate(raw_options):
            if not isinstance(opt, dict):
                return None, f"Option at index {idx} is not a valid object."

            opt_id = str(opt.get("id", expected_ids[idx])).upper().strip()
            if opt_id not in expected_ids:
                opt_id = expected_ids[idx]

            opt_text = str(opt.get("text", "")).strip()
            if not opt_text:
                return None, f"Option {opt_id} text cannot be empty."

            # Check for duplicate option texts (e.g. LLM repeats same choice)
            norm_opt = cls.normalize_text(opt_text)
            if norm_opt in option_texts_seen:
                return None, f"Duplicate option text in question: '{opt_text}'"
            option_texts_seen.add(norm_opt)

            validated_options.append(MCQOption(id=opt_id, text=opt_text))

        # Check that option IDs are uniquely A, B, C, D
        id_set = {o.id for o in validated_options}
        if id_set != set(expected_ids):
            return None, f"Option IDs must contain exactly A, B, C, D. Found: {id_set}"

        # 3. Correct answer validation
        raw_ans = str(q_data.get("correct_answer", "")).upper().strip()
        if raw_ans not in expected_ids:
            return None, f"Invalid correct_answer '{raw_ans}'. Must be one of A, B, C, D."

        # 4. Explanation
        explanation = str(q_data.get("explanation", "")).strip()
        if not explanation or len(explanation) < 5:
            explanation = "Refer to the referenced source section for complete verification."

        # 5. Difficulty
        diff = str(q_data.get("difficulty", "medium")).lower().strip()
        if diff not in {"easy", "medium", "hard"}:
            diff = "medium"

        # 6. Topic
        topic = str(q_data.get("topic", "General")).strip() or "General"

        # 7. Source attribution
        raw_source = q_data.get("source", {})
        if not isinstance(raw_source, dict):
            raw_source = {}

        doc_id = str(raw_source.get("document_id", "")).strip() or fallback_doc_id
        doc_name = str(raw_source.get("document", "")).strip() or fallback_doc_name

        raw_chunks = raw_source.get("chunk_ids", [])
        if isinstance(raw_chunks, list):
            chunk_ids = [str(c).strip() for c in raw_chunks if str(c).strip()]
        else:
            chunk_ids = [str(raw_chunks).strip()] if str(raw_chunks).strip() else []

        raw_locs = raw_source.get("locations", [])
        if isinstance(raw_locs, list):
            locations = [str(loc).strip() for loc in raw_locs if str(loc).strip()]
        else:
            locations = [str(raw_locs).strip()] if str(raw_locs).strip() else []

        if not chunk_ids:
            chunk_ids = [f"{doc_id}_chunk_001"]
        if not locations:
            locations = ["Page 1"]

        source_obj = MCQSource(
            document_id=doc_id,
            document=doc_name,
            chunk_ids=chunk_ids,
            locations=locations
        )

        qid = str(q_data.get("question_id", f"mcq_{len(seen_questions)+1:03d}")).strip()

        item = MCQItem(
            question_id=qid,
            question=question_text,
            options=validated_options,
            correct_answer=raw_ans,
            explanation=explanation,
            difficulty=diff,
            topic=topic,
            source=source_obj
        )

        seen_questions.add(norm_q)
        return item, None

    @classmethod
    def validate_batch(
        cls,
        raw_questions: List[Dict[str, Any]],
        fallback_doc_id: str,
        fallback_doc_name: str
    ) -> List[MCQItem]:
        """
        Validates a list of raw questions, discarding any that fail validation.
        """
        valid_items: List[MCQItem] = []
        seen_questions: Set[str] = set()

        for idx, q_data in enumerate(raw_questions):
            item, error = cls.validate_question(
                q_data=q_data,
                fallback_doc_id=fallback_doc_id,
                fallback_doc_name=fallback_doc_name,
                seen_questions=seen_questions
            )
            if item:
                valid_items.append(item)
            else:
                logger.warning(f"Discarding question #{idx+1}: {error}")

        return valid_items
