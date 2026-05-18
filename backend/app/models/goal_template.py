from sqlalchemy import Column, String, Enum, ForeignKey, Date, Numeric, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class GoalTemplate(Base):
    __tablename__ = "goal_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    thrust_area = Column(String(255), nullable=False)
    uom = Column(Enum('numeric_min', 'numeric_max', 'percent_min', 'percent_max', 'timeline', 'zero', name='uom_types'), nullable=False)
    target = Column(Numeric(15, 2), nullable=False)
    target_date = Column(Date, nullable=True)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("goal_cycles.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    cycle = relationship("GoalCycle")
