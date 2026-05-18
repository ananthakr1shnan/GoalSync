from sqlalchemy import Column, String, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class CheckinComment(Base):
    __tablename__ = "checkin_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    quarter = Column(Enum('Q1', 'Q2', 'Q3', 'Q4', name='quarter_enum'), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

    goal = relationship("Goal")
    manager = relationship("User")
