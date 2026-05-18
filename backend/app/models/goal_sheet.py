from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class GoalSheet(Base):
    __tablename__ = "goal_sheets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("goal_cycles.id"), nullable=False)
    status = Column(Enum('draft', 'submitted', 'approved', 'locked', 'returned', name='sheet_status'), default='draft')
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    locked_at = Column(DateTime, nullable=True)
    manager_note = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint('employee_id', 'cycle_id', name='uq_employee_cycle'),
    )

    employee = relationship("User", back_populates="goal_sheets")
    cycle = relationship("GoalCycle", back_populates="goal_sheets")
    goals = relationship("Goal", back_populates="sheet")
