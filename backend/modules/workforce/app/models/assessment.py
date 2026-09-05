import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

def generate_id(prefix: str = "att") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("att"), index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    competency_id = Column(String(50), ForeignKey("competencies.id"), nullable=True, index=True)
    
    assessment_title = Column(String(150), nullable=False)
    assessment_type = Column(String(50), default="quiz") # pre_training, post_training, quiz, diagnostic
    score_achieved = Column(Float, default=8.0)
    max_score = Column(Float, default=10.0)
    score_pct = Column(Float, default=80.0) # 80.0%
    passed = Column(Boolean, default=True)
    
    strong_areas_json = Column(Text, nullable=True) # JSON list
    weak_areas_json = Column(Text, nullable=True)   # JSON list
    ai_insight = Column(Text, nullable=True)        # Explainable feedback
    completed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="assessment_attempts")
