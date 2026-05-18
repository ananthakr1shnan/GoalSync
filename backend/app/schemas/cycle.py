from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class GoalCycleBase(BaseModel):
    name: str
    is_active: bool = False
    goal_setting_open: Optional[date] = None
    goal_setting_close: Optional[date] = None
    q1_open: Optional[date] = None
    q1_close: Optional[date] = None
    q2_open: Optional[date] = None
    q2_close: Optional[date] = None
    q3_open: Optional[date] = None
    q3_close: Optional[date] = None
    q4_open: Optional[date] = None
    q4_close: Optional[date] = None

class GoalCycleCreate(GoalCycleBase):
    pass

class GoalCycleUpdate(GoalCycleBase):
    name: Optional[str] = None

class GoalCycleResponse(GoalCycleBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
