from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Competency(Base):
    __tablename__ = "competencies"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    domain = Column(String(50), nullable=False, index=True) # Statistical, Technical, Digital, Behavioural
    description = Column(Text, nullable=True)
    baseline_required_level = Column(Float, default=4.0)
    is_emerging = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_competencies = relationship("UserCompetency", back_populates="competency")
    courses = relationship("Course", back_populates="target_competency")
