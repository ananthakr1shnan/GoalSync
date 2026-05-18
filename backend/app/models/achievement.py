from sqlalchemy import Column, String, Enum, ForeignKey, Date, Numeric, Text, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    quarter = Column(Enum('Q1', 'Q2', 'Q3', 'Q4', name='quarter_enum'), nullable=False)
    actual = Column(Numeric(15, 2), nullable=True)
    actual_date = Column(Date, nullable=True)
    status = Column(Enum('not_started', 'on_track', 'completed', name='achievement_status'), default='not_started')
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint('goal_id', 'quarter', name='uq_goal_quarter'),
    )

    goal = relationship("Goal", back_populates="achievements")
