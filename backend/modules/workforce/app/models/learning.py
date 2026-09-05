import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

def generate_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("crs"), index=True)
    title = Column(String(200), nullable=False)
    provider = Column(String(100), default="iGOT Karmayogi") # iGOT Karmayogi, NSSTA, MoSPI Academy
    domain = Column(String(50), nullable=False)
    difficulty = Column(String(20), default="Beginner") # Beginner, Intermediate, Advanced
    duration_hours = Column(Float, default=8.0)
    expected_competency_gain = Column(Float, default=0.4)
    target_competency_id = Column(String(50), ForeignKey("competencies.id"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    target_competency = relationship("Competency", back_populates="courses")
    enrollments = relationship("UserCourseEnrollment", back_populates="course")

class UserCourseEnrollment(Base):
    __tablename__ = "user_course_enrollments"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("enr"), index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(String(50), ForeignKey("courses.id"), nullable=False, index=True)
    progress_pct = Column(Float, default=0.0) # 0 to 100
    status = Column(String(20), default="in_progress") # in_progress, completed, not_started
    learning_hours_spent = Column(Float, default=0.0)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class LearningLog(Base):
    __tablename__ = "learning_logs"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("ll"), index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    hours_spent = Column(Float, default=1.0)
    activity_type = Column(String(50), default="course") # course, quiz, quest, challenge

    # Relationships
    user = relationship("User", back_populates="learning_logs")
