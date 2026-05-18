from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("goal_cycles.id"), nullable=False)
    quarter = Column(Enum('Q1', 'Q2', 'Q3', 'Q4', name='quarter_enum'), nullable=False)
    escalation_type = Column(Enum('checkin_overdue', 'checkin_reminder', 'window_open', name='escalation_type_enum'), nullable=False)
    sent_at = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint('employee_id', 'cycle_id', 'quarter', 'escalation_type', name='uq_escalation_employee_cycle_quarter_type'),
    )

    employee = relationship("User", foreign_keys=[employee_id])
    manager = relationship("User", foreign_keys=[manager_id])
    cycle = relationship("GoalCycle")
