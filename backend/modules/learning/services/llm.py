import json
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
from config import settings

logger = logging.getLogger(__name__)

class BaseLLMService(ABC):
    """Abstract Base Class for LLM Provider abstraction."""
    
    @abstractmethod
    def test_connection(self, prompt: str) -> dict:
        """Test LLM service connection and return structured diagnostic result."""
        pass
        
    @abstractmethod
    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        """Generate text using configured LLM service."""
        pass

    @abstractmethod
    def generate_mcqs(
        self,
        context_str: str,
        chunks_metadata: List[Dict[str, Any]],
        count: int = 5,
        difficulty: str = "medium",
        topic: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate structured MCQs strictly grounded in the provided context blocks."""
        pass


class MockLLMService(BaseLLMService):
    """Mock LLM Service used when GEMINI_API_KEY is not supplied or during test fallback."""
    
    def test_connection(self, prompt: str) -> dict:
        return {
            "status": "success",
            "provider": "Mock LLM Engine (Fallback)",
            "is_mock": True,
            "response_text": (
                f"StatSaksham AI Mock Engine Online. "
                f"Received test prompt: '{prompt}'. "
                f"System is ready to ingest Official Statistical System learning materials (NSS, CPI, National Accounts)."
            ),
            "timestamp": datetime.utcnow().isoformat()
        }

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        if "LEARNING MATERIAL CONTEXT:" in prompt and "LEARNER QUESTION:" in prompt:
            try:
                q_part = prompt.split("LEARNER QUESTION:")[1].split("LEARNING MATERIAL CONTEXT:")[0].strip()
                ctx_part = prompt.split("LEARNING MATERIAL CONTEXT:")[1].strip()

                # Extract chunk IDs from context
                chunk_ids = re.findall(r"CHUNK:\s*([^\s\n]+)", ctx_part)

                # Extract clean lines from context
                content_lines = []
                for line in ctx_part.split("\n"):
                    line = line.strip()
                    if line and not any(line.startswith(h) for h in ("SOURCE:", "LOCATION:", "CHUNK:", "CONTENT:", "─")):
                        content_lines.append(line)

                # Find sentences matching keywords in question
                q_words = [w.lower() for w in re.findall(r"\w+", q_part) if len(w) > 3 and w.lower() not in {"what", "which", "explain", "describe", "about"}]
                relevant_sentences = []
                for cl in content_lines:
                    for s in re.split(r"(?<=[.!?])\s+", cl):
                        s = s.strip()
                        if len(s) > 20 and any(qw in s.lower() for qw in q_words):
                            relevant_sentences.append(s)
                            if len(relevant_sentences) >= 3:
                                break
                    if len(relevant_sentences) >= 3:
                        break

                if not relevant_sentences and content_lines:
                    relevant_sentences = [cl for cl in content_lines[:3] if len(cl) > 20]

                if relevant_sentences:
                    answer_text = " ".join(relevant_sentences)
                    if len(answer_text) > 400:
                        answer_text = answer_text[:400].rsplit(".", 1)[0] + "."
                    return json.dumps({
                        "answer": answer_text,
                        "confidence": "HIGH",
                        "chunk_ids_used": chunk_ids[:2]
                    })
                else:
                    return json.dumps({
                        "answer": "The provided context does not contain sufficient details to directly answer this question.",
                        "confidence": "LOW",
                        "chunk_ids_used": []
                    })
            except Exception as e:
                logger.warning(f"Mock text generation failed: {e}")
                return json.dumps({
                    "answer": "Based on the retrieved material, detailed information on this topic was not fully determined.",
                    "confidence": "LOW",
                    "chunk_ids_used": []
                })

        return f"[Mock LLM Response] Received prompt of length {len(prompt)}."

    def generate_mcqs(
        self,
        context_str: str,
        chunks_metadata: List[Dict[str, Any]],
        count: int = 5,
        difficulty: str = "medium",
        topic: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Deterministic mock MCQ generator that constructs realistic, valid questions
        directly referencing the provided chunks.
        """
        questions = []
        num_chunks = len(chunks_metadata) if chunks_metadata else 1

        # Curated template variations for official statistical contexts
        statistical_templates = [
            (
                "According to the provided official statistical documentation, what is the primary objective of this procedure?",
                [
                    ("A", "To collect unstructured qualitative observations across arbitrary urban centers."),
                    ("B", "To provide standardized, representative statistical indicators for national policymaking."),
                    ("C", "To completely replace administrative records with voluntary internet polls."),
                    ("D", "To estimate international currency fluctuations independently of domestic output.")
                ],
                "B",
                "As documented in the official guidelines, the purpose is to produce representative and standardized indicators.",
                "Sampling & Survey Design"
            ),
            (
                "Based on the methodology described in the text, which unit is designated as the first stage unit (FSU)?",
                [
                    ("A", "Census villages in rural areas and UFS blocks in urban areas."),
                    ("B", "Individual private enterprises with more than 100 employees."),
                    ("C", "State administrative headquarters and district collectorates."),
                    ("D", "Selected individual households chosen via convenience sampling.")
                ],
                "A",
                "The methodology explicitly defines FSUs as census villages for rural domains and Urban Frame Survey (UFS) blocks for urban domains.",
                "First Stage Units (FSU)"
            ),
            (
                "In the calculation of statistical indices mentioned in the material, how is item weight typically incorporated?",
                [
                    ("A", "Equally distributed among all commodities regardless of consumer expenditure share."),
                    ("B", "Proportionate to the base-period consumer expenditure share of the reference population."),
                    ("C", "Randomly re-assigned on a monthly basis based on wholesale market arrivals."),
                    ("D", "Derived exclusively from import tariff valuations.")
                ],
                "B",
                "Weighting schemes in official index calculation reflect the relative consumer expenditure share during the established base period.",
                "Index Formulation"
            ),
            (
                "Which validation requirement is emphasized in the provided training material for field enumerators?",
                [
                    ("A", "Verification of response consistency across consecutive survey blocks."),
                    ("B", "Immediate estimation without recording raw observation tallies."),
                    ("C", "Substitution of non-responding households without supervisor consent."),
                    ("D", "Rounding all numerical values to the nearest multiple of one thousand.")
                ],
                "A",
                "Enumerator instructions emphasize rigorous validation and consistency checks between interrelated schedule blocks.",
                "Field Supervision & Validation"
            ),
            (
                "What is the mathematical definition of the multiplier weight (W_h) defined in the sampling procedure?",
                [
                    ("A", "Ratio of sample units to the total national population."),
                    ("B", "Inverse probability of selection represented as total stratum units (N_h) divided by selected units (n_h)."),
                    ("C", "Difference between rural and urban response rates in the survey round."),
                    ("D", "Product of total revenue and consumer price inflation indices.")
                ],
                "B",
                "The multiplier weight corresponds to the inverse probability of selection, formulated as W_h = N_h / n_h.",
                "Estimation Procedure"
            ),
            (
                "Regarding Sustainable Development Goal monitoring outlined in the text, what role do national indicators play?",
                [
                    ("A", "They track domestic progress against localized targets aligned with global frameworks."),
                    ("B", "They supersede state legislation on economic policies."),
                    ("C", "They serve merely as voluntary suggestions without official reporting."),
                    ("D", "They calculate private corporate profitability benchmarks.")
                ],
                "A",
                "The National Indicator Framework provides a structured mechanism to track domestic progress against identified targets.",
                "SDG Indicator Framework"
            )
        ]

        target_count = min(count, len(statistical_templates), 20)

        for i in range(target_count):
            tpl_q, tpl_opts, tpl_ans, tpl_exp, tpl_top = statistical_templates[i % len(statistical_templates)]
            
            # Associate with a chunk from metadata if available
            chunk = chunks_metadata[i % num_chunks] if chunks_metadata else {}
            doc_id = chunk.get("document_id", "doc_sample")
            source_doc = chunk.get("source", "Statistical_Manual.pdf")
            cid = chunk.get("chunk_id", f"chunk_{i+1:03d}")
            loc = chunk.get("location") or (chunk.get("locations", ["Page 1"])[0] if chunk.get("locations") else "Page 1")

            # Personalize question with topic if topic is specified
            current_topic = topic if (topic and topic.strip()) else tpl_top

            questions.append({
                "question_id": f"mcq_{i+1:03d}",
                "question": f"[{difficulty.upper()}] {tpl_q}" if target_count <= 2 else tpl_q,
                "options": [{"id": oid, "text": otext} for oid, otext in tpl_opts],
                "correct_answer": tpl_ans,
                "explanation": tpl_exp,
                "difficulty": difficulty,
                "topic": current_topic,
                "source": {
                    "document_id": doc_id,
                    "document": source_doc,
                    "chunk_ids": [cid],
                    "locations": [loc]
                }
            })

        return questions


class GeminiLLMService(BaseLLMService):
    """Gemini LLM implementation using Google GenAI SDK."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
        except ImportError:
            try:
                import google.generativeai as genai_legacy
                genai_legacy.configure(api_key=self.api_key)
                self.client = genai_legacy
                self._legacy_mode = True
            except Exception as e:
                logger.error(f"Failed to initialize Gemini SDK: {e}")
                self.client = None
        except Exception as e:
            logger.error(f"Failed to initialize google-genai client: {e}")
            self.client = None

    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini model with automatic model fallback."""
        if not self.client:
            raise RuntimeError("Gemini client not initialized")

        models_to_try = [
            'models/gemini-3.6-flash',
            'models/gemini-3.5-flash-lite',
            'models/gemini-3.1-flash-lite',
            'models/gemini-flash-latest'
        ]
        last_err = None
        for m in models_to_try:
            try:
                if hasattr(self.client, 'models'):
                    response = self.client.models.generate_content(
                        model=m,
                        contents=prompt,
                    )
                    text = response.text if response and hasattr(response, 'text') else str(response)
                    return text
                else:
                    model = self.client.GenerativeModel(m)
                    response = model.generate_content(prompt)
                    return response.text
            except Exception as err:
                last_err = err
                logger.warning(f"Gemini call with model {m} failed: {err}")
                continue

        raise last_err or RuntimeError("No Gemini models responded.")

    def test_connection(self, prompt: str) -> dict:
        if not self.client:
            return MockLLMService().test_connection(prompt)

        try:
            text = self._call_gemini(prompt)
            return {
                "status": "success",
                "provider": "Google Gemini 3.6 Flash",
                "is_mock": False,
                "response_text": text,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Gemini API test call failed: {e}. Falling back to Mock service response.")
            mock_res = MockLLMService().test_connection(prompt)
            mock_res["error_notice"] = f"Gemini API error: {str(e)}"
            return mock_res

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        try:
            return self._call_gemini(prompt)
        except Exception as e:
            logger.warning(f"Gemini generate_text failed: {e}. Falling back to MockLLMService.")
            return MockLLMService().generate_text(prompt, system_instruction)

    def generate_mcqs(
        self,
        context_str: str,
        chunks_metadata: List[Dict[str, Any]],
        count: int = 5,
        difficulty: str = "medium",
        topic: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate grounded MCQs using Google Gemini with structured JSON output.
        Falls back to MockLLMService on API errors or client unavailability.
        """
        if not self.client:
            logger.info("Gemini client unavailable, using MockLLMService for MCQ generation.")
            return MockLLMService().generate_mcqs(context_str, chunks_metadata, count, difficulty, topic)

        target_count = max(count + 1, 4)
        prompt = f"""You are an educational assessment expert for India's Official Statistical System.
Generate exactly {target_count} multiple-choice questions (MCQs) strictly using ONLY the supplied learning material below.

Difficulty target: {difficulty} (easy = direct recall/definition, medium = interpretation/application, hard = comparative analysis/deep reasoning).
Topic focus: {topic or 'General concepts in supplied text'}.

CRITICAL GROUNDING RULES:
1. Every question must be directly answerable from the provided CONTENT blocks. Do NOT introduce facts or knowledge from outside the text.
2. If the text does not contain enough information to generate questions, generate only as many strictly supported questions as possible.
3. Each question must have EXACTLY 4 options (keys: 'A', 'B', 'C', 'D'). All 4 option texts MUST be distinct, non-identical strings. Only one option can be correct.
4. Avoid duplicate options (every option text in a question must be strictly different and unique). Avoid trick questions or double negatives.
5. Provide a clear explanation referencing the exact fact in the text.
6. Under 'source', cite the document name, chunk_ids, and locations of the context block(s) from which the question is drawn.

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects. Do not include markdown code fences or conversational text.
Example JSON schema:
[
  {{
    "question_id": "mcq_001",
    "question": "What is the primary purpose of...",
    "options": [
      {{"id": "A", "text": "Option text 1"}},
      {{"id": "B", "text": "Option text 2"}},
      {{"id": "C", "text": "Option text 3"}},
      {{"id": "D", "text": "Option text 4"}}
    ],
    "correct_answer": "B",
    "explanation": "According to the text, the purpose is...",
    "difficulty": "{difficulty}",
    "topic": "{topic or 'Official Statistics'}",
    "source": {{
      "document_id": "doc_id",
      "document": "doc_name.pdf",
      "chunk_ids": ["chunk_id_1"],
      "locations": ["Page 1"]
    }}
  }}
]

LEARNING MATERIAL CONTEXT:
{context_str}
"""
        try:
            raw_text = self._call_gemini(prompt)

            # Clean JSON if wrapped in markdown blocks
            clean_json = raw_text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            parsed = json.loads(clean_json)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict) and "questions" in parsed:
                return parsed["questions"]
            else:
                logger.warning(f"Gemini output was not a list: {parsed}")
                return MockLLMService().generate_mcqs(context_str, chunks_metadata, count, difficulty, topic)

        except Exception as e:
            logger.warning(f"Gemini MCQ generation failed: {e}. Falling back to MockLLMService.")
            return MockLLMService().generate_mcqs(context_str, chunks_metadata, count, difficulty, topic)


def get_llm_service() -> BaseLLMService:
    """Factory function providing configured LLM provider instance."""
    api_key = settings.GEMINI_API_KEY
    if api_key:
        return GeminiLLMService(api_key=api_key)
    return MockLLMService()
