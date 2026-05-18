from sqlalchemy import Column, String, Boolean, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class GoalCycle(Base):
    __tablename__ = "goal_cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
    goal_setting_open = Column(Date, nullable=True)
    goal_setting_close = Column(Date, nullable=True)
    q1_open = Column(Date, nullable=True)
    q1_close = Column(Date, nullable=True)
    q2_open = Column(Date, nullable=True)
    q2_close = Column(Date, nullable=True)
    q3_open = Column(Date, nullable=True)
    q3_close = Column(Date, nullable=True)
    q4_open = Column(Date, nullable=True)
    q4_close = Column(Date, nullable=True)
    created_at = Column(DateTime, default=func.now())

    goal_sheets = relationship("GoalSheet", back_populates="cycle")
