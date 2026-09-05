import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

def generate_id(prefix: str = "uc") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

class UserCompetency(Base):
    __tablename__ = "user_competencies"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("uc"), index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    competency_id = Column(String(50), ForeignKey("competencies.id"), nullable=False, index=True)
    
    current_level = Column(Float, default=1.0) # 0.0 to 5.0
    required_level = Column(Float, default=4.0)
    baseline_level = Column(Float, default=1.0) # Level before recent interventions
    gap = Column(Float, default=0.0)
    priority = Column(String(20), default="low") # low, medium, high, critical
    status = Column(String(20), default="moderate") # critical, moderate, proficient
    
    explanation = Column(Text, nullable=True) # Explainable AI rationale for gap
    last_assessed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="competencies")
    competency = relationship("Competency", back_populates="user_competencies")
