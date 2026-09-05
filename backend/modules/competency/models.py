import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Numeric,
    DateTime,
    ForeignKey,
    text
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from database import Base


class Official(Base):
    __tablename__ = "officials"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
        index=True
    )
    full_name = Column(Text, nullable=False)
    designation = Column(Text, nullable=False)
    department = Column(Text, nullable=False)
    job_role = Column(Text, nullable=False, index=True)
    current_assignment = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    experience_years = Column(Integer, nullable=True, default=0)
    previous_training = Column(ARRAY(Text), nullable=True)
    career_objective = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("timezone('utc'::text, now())")
    )

    # Relationships
    scores = relationship(
        "OfficialCompetencyScore",
        back_populates="official",
        cascade="all, delete-orphan",
        order_by="OfficialCompetencyScore.competency_id"
    )
    history = relationship(
        "CompetencyHistory",
        back_populates="official",
        cascade="all, delete-orphan",
        order_by="CompetencyHistory.recorded_at.desc()"
    )


class Competency(Base):
    __tablename__ = "competencies"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    category = Column(Text, nullable=False, index=True)
    name = Column(Text, nullable=False)

    # Relationships
    benchmarks = relationship("RoleBenchmark", back_populates="competency")
    scores = relationship("OfficialCompetencyScore", back_populates="competency")
    history = relationship("CompetencyHistory", back_populates="competency")


class RoleBenchmark(Base):
    __tablename__ = "role_benchmarks"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    job_role = Column(Text, nullable=False, index=True)
    competency_id = Column(Integer, ForeignKey("competencies.id"), nullable=True)
    required_score = Column(Numeric(precision=3, scale=2), nullable=True)

    # Relationship
    competency = relationship("Competency", back_populates="benchmarks")


class OfficialCompetencyScore(Base):
    __tablename__ = "official_competency_scores"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
        index=True
    )
    official_id = Column(UUID(as_uuid=True), ForeignKey("officials.id"), nullable=True, index=True)
    competency_id = Column(Integer, ForeignKey("competencies.id"), nullable=True, index=True)
    current_score = Column(Numeric(precision=3, scale=2), nullable=True)
    confidence_weight = Column(Numeric(precision=3, scale=2), nullable=True, default=1.0)
    last_updated = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("timezone('utc'::text, now())")
    )

    # Relationships
    official = relationship("Official", back_populates="scores")
    competency = relationship("Competency", back_populates="scores")


class CompetencyHistory(Base):
    __tablename__ = "competency_history"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    official_id = Column(UUID(as_uuid=True), ForeignKey("officials.id"), nullable=True, index=True)
    competency_id = Column(Integer, ForeignKey("competencies.id"), nullable=True, index=True)
    score = Column(Numeric(precision=3, scale=2), nullable=True)
    source_type = Column(Text, nullable=True)  # e.g., 'ai_baseline', 'assessment', 'manager_review'
    reason = Column(Text, nullable=True)
    recorded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("timezone('utc'::text, now())")
    )

    # Relationships
    official = relationship("Official", back_populates="history")
    competency = relationship("Competency", back_populates="history")
