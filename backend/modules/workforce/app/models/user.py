from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    designation = Column(String(100), nullable=False) # Senior Statistical Officer, JSO, Director, etc.
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=False)
    role = Column(String(20), default="learner", index=True) # learner, trainer, admin
    
    # Profile & Onboarding
    experience_years = Column(Float, default=3.0)
    highest_qualification = Column(String(100), default="Master in Statistics")
    specialization = Column(String(100), default="Econometrics & Survey Sampling")
    career_goal = Column(String(100), default="Data & Statistical Analytics")
    profile_completion_pct = Column(Float, default=68.0)
    
    # Gamification
    xp = Column(Integer, default=720)
    level = Column(Integer, default=7)
    streak_days = Column(Integer, default=6)
    last_active_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="users")
    competencies = relationship("UserCompetency", back_populates="user")
    enrollments = relationship("UserCourseEnrollment", back_populates="user")
    learning_logs = relationship("LearningLog", back_populates="user")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="user")
    quest_progress = relationship("UserQuestProgress", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
