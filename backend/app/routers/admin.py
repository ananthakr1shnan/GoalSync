from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.cycle import GoalCycle
from app.models.goal_template import GoalTemplate
from app.models.goal import Goal
from app.models.goal_sheet import GoalSheet
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.cycle import GoalCycleCreate, GoalCycleResponse
from app.schemas.template import GoalTemplateCreate
from app.services.audit import log_audit_event
from app.core.security import get_password_hash
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])

class SharedGoalPayload(BaseModel):
    template: GoalTemplateCreate
    employee_ids: List[UUID]
    weightage: float

class UnlockPayload(BaseModel):
    reason: str

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).all()

@router.post("/users", response_model=UserResponse)
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_in.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = get_password_hash(password)
    new_user = User(**user_dict)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, user_in: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for k, v in user_in.model_dump(exclude_unset=True).items():
        if k == "password" and v:
            user.password_hash = get_password_hash(v)
        else:
            setattr(user, k, v)
    
    db.commit()
    db.refresh(user)
    return user

@router.get("/cycles", response_model=List[GoalCycleResponse])
def get_cycles(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(GoalCycle).all()

@router.post("/cycles", response_model=GoalCycleResponse)
def create_cycle(cycle_in: GoalCycleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    cycle = GoalCycle(**cycle_in.model_dump())
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle

@router.patch("/cycles/{cycle_id}/activate")
def activate_cycle(cycle_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db.query(GoalCycle).update({GoalCycle.is_active: False})
    cycle = db.query(GoalCycle).filter(GoalCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")
    cycle.is_active = True
    db.commit()
    return {"status": "activated"}

@router.post("/shared-goals")
def create_shared_goals(payload: SharedGoalPayload, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    template = GoalTemplate(
        **payload.template.model_dump(),
        created_by=current_user.id
    )
    db.add(template)
    db.flush()
    
    for emp_id in payload.employee_ids:
        sheet = db.query(GoalSheet).filter(GoalSheet.employee_id == emp_id, GoalSheet.cycle_id == template.cycle_id).first()
        if not sheet or sheet.status not in ["draft", "submitted"]:
            continue
        
        goal = Goal(
            sheet_id=sheet.id,
            template_id=template.id,
            title=template.title,
            description=template.description,
            thrust_area=template.thrust_area,
            uom=template.uom,
            target=template.target,
            target_date=template.target_date,
            weightage=payload.weightage,
        )
        db.add(goal)
    
    db.commit()
    return {"status": "shared goals created"}

@router.post("/goals/{goal_id}/unlock")
def unlock_goal(goal_id: UUID, payload: UnlockPayload, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
    sheet.status = "approved"
    
    log_audit_event(db, goal.id, sheet.id, current_user.id, "GOAL_UNLOCKED", reason=payload.reason)
    db.commit()
    return {"status": "unlocked"}

@router.get("/escalation-log")
def get_escalation_log(
    page: int = 1,
    page_size: int = 20,
    quarter: str = None,
    employee_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.models.escalation_log import EscalationLog
    query = db.query(EscalationLog)
    
    if quarter:
        query = query.filter(EscalationLog.quarter == quarter)
    if employee_id:
        query = query.filter(EscalationLog.employee_id == employee_id)
        
    total = query.count()
    offset = (page - 1) * page_size
    entries = query.order_by(EscalationLog.sent_at.desc()).offset(offset).limit(page_size).all()
    
    results = []
    for entry in entries:
        results.append({
            "id": str(entry.id),
            "employee_id": str(entry.employee_id),
            "employee_name": entry.employee.name if entry.employee else "Unknown",
            "manager_id": str(entry.manager_id),
            "manager_name": entry.manager.name if entry.manager else "Unknown",
            "cycle_id": str(entry.cycle_id),
            "cycle_name": entry.cycle.name if entry.cycle else "Unknown",
            "quarter": entry.quarter,
            "escalation_type": entry.escalation_type,
            "sent_at": entry.sent_at.isoformat() if entry.sent_at else None
        })
        
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": results
    }

@router.get("/escalation-config")
def get_escalation_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.core.config import config
    return {
        "escalation_threshold_days": config.ESCALATION_THRESHOLD_DAYS,
        "escalation_enabled": config.ESCALATION_ENABLED
    }

@router.post("/escalation/trigger-now")
async def trigger_escalation_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.services.escalation_service import check_checkin_overdue, send_checkin_window_notifications
    from datetime import datetime
    
    await check_checkin_overdue()
    await send_checkin_window_notifications()
    
    return {
        "triggered": True,
        "timestamp": datetime.now().isoformat()
    }

