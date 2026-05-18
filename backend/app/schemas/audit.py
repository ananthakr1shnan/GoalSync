from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class GoalAuditLogResponse(BaseModel):
    id: UUID
    goal_id: UUID
    sheet_id: UUID
    changed_by: UUID
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    changed_at: datetime

    model_config = {"from_attributes": True}
