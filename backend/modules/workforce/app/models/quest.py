import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.core.database import Base

def generate_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

class QuestChallenge(Base):
    __tablename__ = "quest_challenges"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("qst"), index=True)
    type = Column(String(50), nullable=False, index=True) # data_detective, statistical_sudoku, visualization, real_world_mission, daily_challenge
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(20), default="Medium") # Easy, Medium, Hard
    xp_reward = Column(Integer, default=100)
    
    payload_json = Column(Text, nullable=False) # JSON puzzle content (dataset, grid, scenario, options)
    solution_json = Column(Text, nullable=False) # JSON solution data + explanations
    is_daily = Column(Boolean, default=False)
    daily_date = Column(String(10), nullable=True, index=True) # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_attempts = relationship("UserQuestProgress", back_populates="challenge")

class UserQuestProgress(Base):
    __tablename__ = "user_quest_progress"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("uqp"), index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    quest_challenge_id = Column(String(50), ForeignKey("quest_challenges.id"), nullable=False, index=True)
    status = Column(String(20), default="completed") # completed, attempted, failed
    score = Column(Float, default=100.0)
    xp_earned = Column(Integer, default=100)
    user_submission_json = Column(Text, nullable=True)
    feedback_json = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="quest_progress")
    challenge = relationship("QuestChallenge", back_populates="user_attempts")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("ach"), index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    icon = Column(String(50), default="🏆")
    xp_reward = Column(Integer, default=50)

    # Relationships
    unlocked_users = relationship("UserAchievement", back_populates="achievement")

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(String(50), primary_key=True, default=lambda: generate_id("ua"), index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(String(50), ForeignKey("achievements.id"), nullable=False, index=True)
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="unlocked_users")
