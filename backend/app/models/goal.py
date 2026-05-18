from sqlalchemy import Column, String, Enum, ForeignKey, Date, Numeric, Integer, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sheet_id = Column(UUID(as_uuid=True), ForeignKey("goal_sheets.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    thrust_area = Column(String(255), nullable=False)
    uom = Column(Enum('numeric_min', 'numeric_max', 'percent_min', 'percent_max', 'timeline', 'zero', name='uom_types'), nullable=False)
    target = Column(Numeric(15, 2), nullable=False)
    target_date = Column(Date, nullable=True)
    weightage = Column(Numeric(5, 2), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("goal_templates.id"), nullable=True)
    display_order = Column(Integer, default=0)

    __table_args__ = (
        CheckConstraint('weightage >= 10 AND weightage <= 100', name='chk_weightage'),
    )

    sheet = relationship("GoalSheet", back_populates="goals")
    template = relationship("GoalTemplate")
    achievements = relationship("Achievement", back_populates="goal", cascade="all, delete-orphan")

    @property
    def progress_score(self) -> float:
        if not self.achievements:
            return 0.0
        q_map = {'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4}
        latest_ach = max(self.achievements, key=lambda a: q_map.get(a.quarter, 0))
        
        from app.services.progress import compute_progress
        return compute_progress(
            uom=self.uom,
            target=float(self.target),
            actual=float(latest_ach.actual) if latest_ach.actual is not None else None,
            target_date=self.target_date,
            actual_date=latest_ach.actual_date
        )

