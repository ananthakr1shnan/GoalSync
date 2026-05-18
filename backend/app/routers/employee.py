from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.goal_sheet import GoalSheet
from app.models.goal import Goal
from app.models.cycle import GoalCycle
from app.schemas.sheet import GoalSheetResponse, GoalSheetCreate
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter(prefix="/goal-sheets", tags=["employee-sheets"])

@router.get("/", response_model=List[GoalSheetResponse])
def get_my_sheets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(GoalSheet).filter(GoalSheet.employee_id == current_user.id).all()

@router.post("/", response_model=GoalSheetResponse)
def create_draft_sheet(sheet_in: GoalSheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(GoalSheet).filter(GoalSheet.employee_id == current_user.id, GoalSheet.cycle_id == sheet_in.cycle_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Sheet already exists for this cycle")
    new_sheet = GoalSheet(employee_id=current_user.id, cycle_id=sheet_in.cycle_id, status="draft")
    db.add(new_sheet)
    db.commit()
    db.refresh(new_sheet)
    return new_sheet

@router.get("/{sheet_id}", response_model=GoalSheetResponse)
def get_sheet(sheet_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return sheet

@router.post("/{sheet_id}/goals", response_model=GoalResponse)
def add_goal(sheet_id: UUID, goal_in: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    if sheet.status not in ["draft", "returned"]:
        raise HTTPException(status_code=400, detail="Cannot edit non-draft sheet")
    
    if len(sheet.goals) >= 8:
        raise HTTPException(status_code=400, detail="Max 8 goals allowed")
    if goal_in.weightage < 10:
        raise HTTPException(status_code=400, detail="Minimum weightage is 10%")
    
    new_goal = Goal(**goal_in.model_dump(), sheet_id=sheet_id)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.patch("/{sheet_id}/goals/{goal_id}", response_model=GoalResponse)
def edit_goal(sheet_id: UUID, goal_id: UUID, goal_in: GoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet or sheet.status not in ["draft", "returned"]:
        raise HTTPException(status_code=400, detail="Cannot edit")
    
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.sheet_id == sheet_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for k, v in goal_in.model_dump(exclude_unset=True).items():
        setattr(goal, k, v)
    
    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/{sheet_id}/goals/{goal_id}")
def delete_goal(sheet_id: UUID, goal_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet or sheet.status not in ["draft", "returned"]:
        raise HTTPException(status_code=400, detail="Cannot edit")
    
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.sheet_id == sheet_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    return {"status": "ok"}

@router.patch("/{sheet_id}/submit")
def submit_sheet(sheet_id: UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet or sheet.status not in ["draft", "returned"]:
        raise HTTPException(status_code=400, detail="Cannot submit")
    
    if not sheet.goals:
        raise HTTPException(status_code=400, detail="At least 1 goal required")
    
    total_weightage = sum(g.weightage for g in sheet.goals)
    if total_weightage != 100:
        raise HTTPException(status_code=400, detail="Total weightage must be 100%")
    
    sheet.status = "submitted"
    db.commit()

    # Async notification to manager
    if current_user.manager_id:
        manager = db.query(User).filter(User.id == current_user.manager_id).first()
        cycle = db.query(GoalCycle).filter(GoalCycle.id == sheet.cycle_id).first()
        if manager and manager.email:
            from app.services.email_service import notify_goal_submitted
            background_tasks.add_task(
                notify_goal_submitted,
                employee_name=current_user.name,
                manager_email=manager.email,
                manager_name=manager.name,
                cycle_name=cycle.name if cycle else "Active Cycle"
            )
            
    return {"status": "submitted"}
