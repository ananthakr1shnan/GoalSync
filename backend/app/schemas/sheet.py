# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.goal import GoalResponse

class GoalSheetBase(BaseModel):
    status: str = 'draft'
    manager_note: Optional[str] = None

class GoalSheetCreate(BaseModel):
    employee_id: Optional[UUID] = None
    cycle_id: UUID

class GoalSheetUpdate(BaseModel):
    status: Optional[str] = None
    manager_note: Optional[str] = None

class GoalSheetResponse(GoalSheetBase):
    id: UUID
    employee_id: UUID
    cycle_id: UUID
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    locked_at: Optional[datetime] = None
    goals: Optional[List[GoalResponse]] = []

    model_config = {"from_attributes": True}
