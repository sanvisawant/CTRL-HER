from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from models.assessment import MCQOption, MCQSource, MCQItem

QuestionBankStatus = Literal["DRAFT", "APPROVED", "REJECTED"]
QuestionOrigin = Literal["GENERATED", "MANUAL"]

class QuestionBankItem(BaseModel):
    """
    Persistent question bank item supporting trainer review, editing, approval, and quiz reuse.
    Preserves complete source provenance connected to official statistical materials.
    """
    question_id: str = Field(..., example="qb_1a2b3c4d5e")
    question: str = Field(..., min_length=5, example="What is the primary purpose of stratified sampling?")
    options: List[MCQOption] = Field(..., min_length=4, max_length=4)
    correct_answer: Literal["A", "B", "C", "D"] = Field(..., example="B")
    explanation: str = Field(..., min_length=5, example="Stratified sampling divides a heterogeneous population into homogeneous subgroups.")
    difficulty: Literal["easy", "medium", "hard"] = Field(default="medium")
    topic: str = Field(default="General", example="Sampling Techniques")
    source: MCQSource
    status: QuestionBankStatus = Field(default="DRAFT")
    origin: QuestionOrigin = Field(default="GENERATED")
    created_at: str
    updated_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None


class QuestionBankSaveRequest(BaseModel):
    """
    Request model to save a generated or manual MCQ into the Trainer Question Bank.
    """
    question: str = Field(..., min_length=5)
    options: List[MCQOption] = Field(..., min_length=4, max_length=4)
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str = Field(default="", min_length=0)
    difficulty: Literal["easy", "medium", "hard"] = Field(default="medium")
    topic: str = Field(default="General")
    source: MCQSource
    origin: QuestionOrigin = Field(default="GENERATED")


class QuestionBankUpdateRequest(BaseModel):
    """
    Request model for trainer editing.
    Source provenance (document_id, chunk lineage) remains strictly immutable.
    """
    question: Optional[str] = Field(default=None, min_length=5)
    options: Optional[List[MCQOption]] = Field(default=None, min_length=4, max_length=4)
    correct_answer: Optional[Literal["A", "B", "C", "D"]] = None
    explanation: Optional[str] = Field(default=None, min_length=5)
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    topic: Optional[str] = Field(default=None, min_length=1)


class QuestionBankListResponse(BaseModel):
    """List response for trainer question bank."""
    total: int
    items: List[QuestionBankItem]


class QuizFromBankRequest(BaseModel):
    """
    Request to assemble a learner quiz session using approved question bank items.
    """
    topic: Optional[str] = Field(default=None, example="Sampling Design")
    difficulty: Optional[Literal["easy", "medium", "hard"]] = Field(default=None, example="medium")
    count: int = Field(default=5, ge=1, le=20, example=5)
    learner_id: str = Field(default="learner_default", example="officer_sharma")
