import json
import logging
import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from config import get_settings
from schemas import OfficialProfileCreate, SelfAssessmentItem

logger = logging.getLogger("statsaksham.ai_evaluator")
settings = get_settings()


class CompetencyEvaluationItem(BaseModel):
    competency_id: int = Field(..., ge=1, le=33)
    calibrated_score: float = Field(..., ge=1.0, le=5.0)
    confidence_weight: float = Field(..., ge=0.5, le=1.0)
    reason: str


class AICalibrationResponse(BaseModel):
    evaluations: List[CompetencyEvaluationItem]
    overall_evaluation_summary: str


class CriticalGapRationaleResponse(BaseModel):
    rationales: List[str]


# Predefined master list reference for all 33 competencies
MASTER_COMPETENCY_DICT = {
    1: {"category": "Statistical", "name": "Survey Design"},
    2: {"category": "Statistical", "name": "Sampling"},
    3: {"category": "Statistical", "name": "National Accounts"},
    4: {"category": "Statistical", "name": "Price Statistics"},
    5: {"category": "Statistical", "name": "Labour Statistics"},
    6: {"category": "Statistical", "name": "Agricultural Statistics"},
    7: {"category": "Statistical", "name": "Industrial Statistics"},
    8: {"category": "Statistical", "name": "SDG Indicators"},
    9: {"category": "Statistical", "name": "Metadata Standards"},
    10: {"category": "Statistical", "name": "Data Quality"},
    11: {"category": "Technical", "name": "Python"},
    12: {"category": "Technical", "name": "R"},
    13: {"category": "Technical", "name": "SQL"},
    14: {"category": "Technical", "name": "Stata"},
    15: {"category": "Technical", "name": "SPSS"},
    16: {"category": "Technical", "name": "SAS"},
    17: {"category": "Technical", "name": "GIS"},
    18: {"category": "Technical", "name": "Data Visualization"},
    19: {"category": "Technical", "name": "AI/ML"},
    20: {"category": "Technical", "name": "Cloud"},
    21: {"category": "Technical", "name": "APIs"},
    22: {"category": "Technical", "name": "Open Data"},
    23: {"category": "Digital Governance", "name": "Cybersecurity"},
    24: {"category": "Digital Governance", "name": "Data Privacy"},
    25: {"category": "Digital Governance", "name": "Digital Signatures"},
    26: {"category": "Digital Governance", "name": "Government Cloud"},
    27: {"category": "Digital Governance", "name": "DPI"},
    28: {"category": "Behavioural & Managerial", "name": "Leadership"},
    29: {"category": "Behavioural & Managerial", "name": "Communication"},
    30: {"category": "Behavioural & Managerial", "name": "Project Management"},
    31: {"category": "Behavioural & Managerial", "name": "Ethics"},
    32: {"category": "Behavioural & Managerial", "name": "Decision Making"},
    33: {"category": "Behavioural & Managerial", "name": "Change Management"}
}


class CompetencyAIEvaluator:
    """
    Isolated AI service for MoSPI official competency calibration and gap explainability.
    Supports Google Gemini, OpenAI, and deterministic heuristic fallback.
    """

    def __init__(self):
        self.settings = get_settings()

    def evaluate_profile(
        self,
        profile: OfficialProfileCreate,
        master_competencies: Optional[List[Dict[str, Any]]] = None
    ) -> List[CompetencyEvaluationItem]:
        """
        Produce calibrated baseline scores (1.0 - 5.0) across all 33 competencies.
        Tries Gemini or OpenAI first if API keys exist, falling back to heuristic evaluation.
        """
        # Attempt LLM evaluation if configured
        if self.settings.AI_PROVIDER == "gemini" and self.settings.GEMINI_API_KEY:
            try:
                res = self._evaluate_with_gemini(profile)
                if res and len(res.evaluations) >= 33:
                    logger.info("Successfully evaluated profile using Google Gemini.")
                    return res.evaluations
            except Exception as e:
                logger.warning(f"Gemini evaluation failed: {e}. Falling back to domain heuristic.", exc_info=True)

        elif self.settings.AI_PROVIDER == "openai" and self.settings.OPENAI_API_KEY:
            try:
                res = self._evaluate_with_openai(profile)
                if res and len(res.evaluations) >= 33:
                    logger.info("Successfully evaluated profile using OpenAI.")
                    return res.evaluations
            except Exception as e:
                logger.warning(f"OpenAI evaluation failed: {e}. Falling back to domain heuristic.", exc_info=True)

        # Resilient domain heuristic fallback
        logger.info("Using calibrated MoSPI domain heuristic evaluator.")
        return self._heuristic_evaluation(profile)

    def generate_gap_rationales(
        self,
        official_name: str,
        job_role: str,
        top_critical_gaps: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate explainable AI rationales for the top 3 critical skill gaps.
        """
        if not top_critical_gaps:
            return ["All competencies meet or exceed required role benchmarks. Profile is fully qualified."]

        # Attempt LLM explainability if keys present
        if self.settings.AI_PROVIDER == "gemini" and self.settings.GEMINI_API_KEY:
            try:
                rationales = self._explain_gaps_with_gemini(official_name, job_role, top_critical_gaps)
                if rationales:
                    return rationales
            except Exception as e:
                logger.warning(f"Gemini gap explainability failed: {e}. Using heuristic explanations.")

        elif self.settings.AI_PROVIDER == "openai" and self.settings.OPENAI_API_KEY:
            try:
                rationales = self._explain_gaps_with_openai(official_name, job_role, top_critical_gaps)
                if rationales:
                    return rationales
            except Exception as e:
                logger.warning(f"OpenAI gap explainability failed: {e}. Using heuristic explanations.")

        # Heuristic explanation generator
        return self._heuristic_gap_rationales(official_name, job_role, top_critical_gaps)

    # -------------------------------------------------------------------------
    # Gemini API Implementation
    # -------------------------------------------------------------------------
    def _evaluate_with_gemini(self, profile: OfficialProfileCreate) -> AICalibrationResponse:
        from google import genai
        client = genai.Client(api_key=self.settings.GEMINI_API_KEY)

        prompt = self._build_calibration_prompt(profile)
        response = client.models.generate_content(
            model=self.settings.GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": AICalibrationResponse
            }
        )
        data = json.loads(response.text)
        return AICalibrationResponse(**data)

    def _explain_gaps_with_gemini(
        self,
        official_name: str,
        job_role: str,
        top_critical_gaps: List[Dict[str, Any]]
    ) -> List[str]:
        from google import genai
        client = genai.Client(api_key=self.settings.GEMINI_API_KEY)

        prompt = (
            f"You are the MoSPI AI Competency Advisor for StatSaksham platform.\n"
            f"Official: {official_name}\nJob Role: {job_role}\n"
            f"Top Critical Gaps:\n{json.dumps(top_critical_gaps, indent=2)}\n\n"
            f"Provide exactly {len(top_critical_gaps)} clear, actionable, diagnostic rationales "
            f"(one per gap) explaining why this gap impacts their official duties and recommending "
            f"a specific MoSPI training program or practical deployment."
        )
        response = client.models.generate_content(
            model=self.settings.GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": CriticalGapRationaleResponse
            }
        )
        data = json.loads(response.text)
        return data.get("rationales", [])

    # -------------------------------------------------------------------------
    # OpenAI API Implementation
    # -------------------------------------------------------------------------
    def _evaluate_with_openai(self, profile: OfficialProfileCreate) -> AICalibrationResponse:
        import openai
        client = openai.OpenAI(api_key=self.settings.OPENAI_API_KEY)

        prompt = self._build_calibration_prompt(profile)
        completion = client.beta.chat.completions.parse(
            model=self.settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a Senior MoSPI Competency Evaluation AI for StatSaksham."},
                {"role": "user", "content": prompt}
            ],
            response_format=AICalibrationResponse
        )
        return completion.choices[0].message.parsed

    def _explain_gaps_with_openai(
        self,
        official_name: str,
        job_role: str,
        top_critical_gaps: List[Dict[str, Any]]
    ) -> List[str]:
        import openai
        client = openai.OpenAI(api_key=self.settings.OPENAI_API_KEY)

        prompt = (
            f"Official: {official_name}, Job Role: {job_role}\n"
            f"Critical Gaps:\n{json.dumps(top_critical_gaps, indent=2)}\n"
            f"Generate diagnostic rationales for the {len(top_critical_gaps)} critical gaps."
        )
        completion = client.beta.chat.completions.parse(
            model=self.settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are the MoSPI StatSaksham Skill Gap Explainability Advisor."},
                {"role": "user", "content": prompt}
            ],
            response_format=CriticalGapRationaleResponse
        )
        return completion.choices[0].message.parsed.rationales

    # -------------------------------------------------------------------------
    # Prompt Construction
    # -------------------------------------------------------------------------
    def _build_calibration_prompt(self, profile: OfficialProfileCreate) -> str:
        self_ratings_dict = {
            item.competency_id: {"rating": item.rating, "notes": item.notes}
            for item in profile.self_assessments
        }

        competencies_listing = "\n".join([
            f"- ID {cid}: [{info['category']}] {info['name']}"
            for cid, info in MASTER_COMPETENCY_DICT.items()
        ])

        return f"""
You are the Senior MoSPI (Ministry of Statistics and Programme Implementation) Competency Intelligence Evaluator for StatSaksham AI platform.

### OFFICIAL PROFILE:
- Full Name: {profile.full_name}
- Designation: {profile.designation}
- Department: {profile.department}
- Job Role: {profile.job_role}
- Current Assignment: {profile.current_assignment or 'Not specified'}
- Education: {profile.education or 'Not specified'}
- Experience Years: {profile.experience_years}
- Attended Trainings: {json.dumps(profile.previous_training or [])}
- Career Objective: {profile.career_objective or 'Not specified'}

### SELF-ASSESSMENT RATINGS:
{json.dumps(self_ratings_dict, indent=2)}

### MASTER COMPETENCIES (Must evaluate all 33):
{competencies_listing}

### INSTRUCTIONS:
1. Review candidate's self-ratings in comparison to their total experience ({profile.experience_years} years), education, assignment, and attended trainings.
2. Moderate ungrounded high self-ratings (e.g., claiming 5.0 in National Accounts with low experience and no relevant training should be calibrated to 2.5 - 3.2 with lower confidence weight).
3. Reinforce substantiated claims where previous trainings or extensive tenure confirm proficiency.
4. For competencies without self-ratings, estimate an intelligent baseline derived from their role and background.
5. Provide calibrated_score (1.0 - 5.0), confidence_weight (0.5 - 1.0), and a concise MoSPI rationale for each of the 33 competencies.
"""

    # -------------------------------------------------------------------------
    # Resilient Calibrated MoSPI Domain Heuristic
    # -------------------------------------------------------------------------
    def _heuristic_evaluation(self, profile: OfficialProfileCreate) -> List[CompetencyEvaluationItem]:
        self_map = {item.competency_id: item.rating for item in (profile.self_assessments or [])}
        exp_years = profile.experience_years
        trainings_text = " ".join(profile.previous_training or []).lower()
        edu_text = (profile.education or "").lower()
        role_text = (profile.job_role or "").lower()
        assignment_text = (profile.current_assignment or "").lower()

        combined_text = f"{trainings_text} {edu_text} {role_text} {assignment_text}"

        evaluations: List[CompetencyEvaluationItem] = []

        # Domain keywords mapping
        keywords_map = {
            1: ["survey", "field", "sampling", "questionnaire", "nsso"],
            2: ["sampling", "strata", "sample", "multistage", "probability"],
            3: ["national accounts", "gdp", "gva", "cso", "macroeconomic", "input-output"],
            4: ["price", "cpi", "wpi", "inflation", "index"],
            5: ["labour", "employment", "plfs", "workforce", "wage"],
            6: ["agriculture", "crop", "farming", "land use", "agristat"],
            7: ["industry", "asi", "factory", "iip", "manufacturing"],
            8: ["sdg", "sustainable development", "indicators", "niti aayog"],
            9: ["metadata", "sdmx", "standards", "classification", "nic"],
            10: ["data quality", "validation", "scrutiny", "cleaning", "audit"],
            11: ["python", "pandas", "numpy", "django", "fastapi"],
            12: ["r", "rstudio", "tidyverse", "bioconductor"],
            13: ["sql", "postgres", "database", "query", "oracle", "mysql"],
            14: ["stata", "econometrics"],
            15: ["spss", "social science"],
            16: ["sas", "statistical analysis system"],
            17: ["gis", "geospatial", "arcgis", "qgis", "remote sensing", "map"],
            18: ["visualization", "tableau", "power bi", "dashboard", "d3", "matplotlib"],
            19: ["ai", "ml", "machine learning", "deep learning", "nlp", "llm"],
            20: ["cloud", "aws", "azure", "meghraj", "gcp"],
            21: ["api", "rest", "graphql", "microservices", "integration"],
            22: ["open data", "ndsap", "data.gov.in", "portal", "catalog"],
            23: ["cybersecurity", "cert-in", "security", "firewall", "encryption"],
            24: ["privacy", "dpdp", "data protection", "gdpr", "consent"],
            25: ["digital signature", "dsc", "e-sign", "pki"],
            26: ["government cloud", "nic cloud", "meghraj", "data center"],
            27: ["dpi", "aadhaar", "upi", "digilocker", "api setu", "india stack"],
            28: ["leadership", "director", "head", "manager", "team lead", "supervision"],
            29: ["communication", "presentation", "report writing", "briefing"],
            30: ["project management", "pmp", "agile", "monitoring", "milestones"],
            31: ["ethics", "integrity", "conduct rules", "vigilance", "governance"],
            32: ["decision making", "policy", "analysis", "administration"],
            33: ["change management", "reform", "transition", "modernization"]
        }

        for cid, info in MASTER_COMPETENCY_DICT.items():
            comp_name = info["name"]
            comp_cat = info["category"]
            self_val = self_map.get(cid)

            # Check keyword relevance
            relevant_keywords = keywords_map.get(cid, [comp_name.lower()])
            matches = [kw for kw in relevant_keywords if kw in combined_text]
            has_relevant_training = any(kw in trainings_text for kw in relevant_keywords)
            has_relevant_edu = any(kw in edu_text for kw in relevant_keywords)

            # Base expectation from tenure and background
            exp_factor = min(1.0, exp_years / 12.0)
            baseline = 2.0 + (1.2 * exp_factor)

            if matches:
                baseline += 0.5
            if has_relevant_training:
                baseline += 0.4
            if has_relevant_edu:
                baseline += 0.3

            if self_val is not None:
                # Calibrate self-rating against evidence
                if self_val >= 4.5:
                    if exp_years >= 6 or has_relevant_training:
                        calibrated = round(min(5.0, self_val), 1)
                        confidence = 0.90
                        reason = f"High self-rating confirmed by verified experience ({exp_years}y) and background in {comp_name}."
                    elif exp_years >= 3:
                        calibrated = round(min(4.0, self_val - 0.5), 1)
                        confidence = 0.78
                        reason = f"Proficiency moderated from {self_val} to {calibrated} based on mid-level tenure ({exp_years}y)."
                    else:
                        calibrated = round(min(3.2, self_val - 1.5), 1)
                        confidence = 0.65
                        reason = f"Unsubstantiated mastery claim ({self_val}); moderated to {calibrated} due to early-career tenure ({exp_years}y)."
                elif self_val <= 2.0:
                    if matches and exp_years >= 5:
                        calibrated = round(self_val + 0.5, 1)
                        confidence = 0.85
                        reason = f"Slight upward adjustment: candidate underreported skill given relevant experience in {comp_name}."
                    else:
                        calibrated = round(self_val, 1)
                        confidence = 0.92
                        reason = f"Self-reported development area acknowledged ({self_val})."
                else:
                    # Moderate self-rating 2.1 - 4.4
                    evidence_weight = 0.6 if matches else 0.4
                    calibrated = round((self_val * 0.7) + (baseline * 0.3), 1)
                    confidence = 0.82 if matches else 0.72
                    reason = f"Calibrated baseline based on self-assessment ({self_val}) weighted with profile tenure."
            else:
                # Unrated competency: derived baseline
                calibrated = round(min(4.5, max(1.5, baseline)), 1)
                confidence = 0.60 if not matches else 0.75
                reason = f"Estimated baseline derived from official designation, {exp_years}y tenure, and department context."

            # Ensure valid bounds 1.0 to 5.0
            calibrated = max(1.0, min(5.0, calibrated))
            confidence = max(0.5, min(1.0, confidence))

            evaluations.append(CompetencyEvaluationItem(
                competency_id=cid,
                calibrated_score=calibrated,
                confidence_weight=confidence,
                reason=reason
            ))

        return evaluations

    def _heuristic_gap_rationales(
        self,
        official_name: str,
        job_role: str,
        top_critical_gaps: List[Dict[str, Any]]
    ) -> List[str]:
        rationales = []
        for i, gap in enumerate(top_critical_gaps, 1):
            comp = gap.get("competency_name", "Skill")
            cat = gap.get("category", "General")
            curr = gap.get("current_score", 0.0)
            req = gap.get("required_score", 0.0)
            gap_val = gap.get("gap", 0.0)

            rationale = (
                f"{i}. Critical Gap ({gap_val:+.1f}) in '{comp}' [{cat}]: "
                f"Official's calibrated proficiency ({curr:.1f}) is substantially below the benchmark ({req:.1f}) "
                f"mandated for {job_role}. An immediate deployment to MoSPI's specialized '{comp} Immersion Workshop' "
                f"or paired on-job mentorship is strongly recommended to fulfill core operational deliverables."
            )
            rationales.append(rationale)
        return rationales


# Global singleton instance
ai_evaluator = CompetencyAIEvaluator()
