from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

class GoalTemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    thrust_area: str
    uom: str
    target: Decimal
    target_date: Optional[date] = None

class GoalTemplateCreate(GoalTemplateBase):
    cycle_id: UUID

class GoalTemplateResponse(GoalTemplateBase):
    id: UUID
    cycle_id: UUID
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
