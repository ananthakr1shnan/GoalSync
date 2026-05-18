from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class CheckinCommentBase(BaseModel):
    quarter: str
    comment: str

class CheckinCommentCreate(CheckinCommentBase):
    goal_id: UUID

class CheckinCommentResponse(CheckinCommentBase):
    id: UUID
    goal_id: UUID
    manager_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
