from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str
    manager_id: Optional[UUID] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[UUID] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    manager_id: Optional[UUID] = None

    model_config = {"from_attributes": True}
