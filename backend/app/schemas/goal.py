from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

class AchievementBase(BaseModel):
    quarter: str
    actual: Optional[Decimal] = None
    actual_date: Optional[date] = None
    status: str = 'not_started'
    notes: Optional[str] = None

class AchievementCreate(AchievementBase):
    goal_id: UUID

class AchievementUpdate(AchievementBase):
    quarter: Optional[str] = None

class AchievementResponse(AchievementBase):
    id: UUID
    goal_id: UUID
    updated_at: datetime
    updated_by: UUID

    model_config = {"from_attributes": True}

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    thrust_area: str
    uom: str
    target: Decimal
    target_date: Optional[date] = None
    weightage: Decimal
    display_order: int = 0

class GoalCreate(GoalBase):
    template_id: Optional[UUID] = None

class GoalUpdate(GoalBase):
    title: Optional[str] = None
    thrust_area: Optional[str] = None
    uom: Optional[str] = None
    target: Optional[Decimal] = None
    weightage: Optional[Decimal] = None

class GoalResponse(GoalBase):
    id: UUID
    sheet_id: UUID
    template_id: Optional[UUID] = None
    progress_score: float = 0.0
    achievements: Optional[List[AchievementResponse]] = []

    model_config = {"from_attributes": True}
