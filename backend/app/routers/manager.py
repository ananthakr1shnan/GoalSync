from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID
from app.database import get_db
from app.core.dependencies import require_manager, get_current_user
from app.models.user import User
from app.models.goal_sheet import GoalSheet
from app.models.goal import Goal
from app.models.checkin import CheckinComment
from app.schemas.sheet import GoalSheetResponse
from app.schemas.checkin import CheckinCommentCreate, CheckinCommentResponse
from app.services.audit import log_audit_event
from pydantic import BaseModel

router = APIRouter(prefix="/manager", tags=["manager"])

class ApprovalPayload(BaseModel):
    goals: List[Dict[str, Any]] = []

class ReturnPayload(BaseModel):
    note: str

@router.get("/team")
def get_team(db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    from app.models.cycle import GoalCycle
    from app.schemas.sheet import GoalSheetResponse

    reports = db.query(User).filter(User.manager_id == current_user.id).all()

    result = []
    for emp in reports:
        sheets = db.query(GoalSheet).filter(GoalSheet.employee_id == emp.id).all()
        # Build enriched response dict with goal_sheets
        result.append({
            "id": str(emp.id),
            "name": emp.name,
            "email": emp.email,
            "role": emp.role,
            "department": emp.department,
            "manager_id": str(emp.manager_id) if emp.manager_id else None,
            "is_active": emp.is_active,
            "goal_sheets": [
                {
                    "id": str(s.id),
                    "employee_id": str(s.employee_id),
                    "cycle_id": str(s.cycle_id),
                    "status": s.status,
                    "manager_note": s.manager_note,
                    "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                    "approved_at": s.approved_at.isoformat() if s.approved_at else None,
                    "locked_at": s.locked_at.isoformat() if s.locked_at else None,
                    "goals": [
                        {
                            "id": str(g.id),
                            "sheet_id": str(g.sheet_id),
                            "title": g.title,
                            "thrust_area": g.thrust_area,
                            "uom": g.uom,
                            "target": float(g.target),
                            "weightage": float(g.weightage),
                            "display_order": g.display_order,
                            "progress_score": g.progress_score,
                            "achievements": []
                        }
                        for g in s.goals
                    ]
                }
                for s in sheets
            ]
        })
    return result

@router.get("/team/{employee_id}/sheet/{sheet_id}", response_model=GoalSheetResponse)
def get_team_sheet(employee_id: UUID, sheet_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    employee = db.query(User).filter(User.id == employee_id, User.manager_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=403, detail="Not a direct report")
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == employee_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return sheet

@router.patch("/sheets/{sheet_id}/approve")
def approve_sheet(sheet_id: UUID, payload: ApprovalPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    employee = db.query(User).filter(User.id == sheet.employee_id).first()
    if employee.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to approve this sheet")
    
    if sheet.status != "submitted":
        raise HTTPException(status_code=400, detail="Sheet must be submitted to be approved")
    
    for updated_goal in payload.goals:
        goal_id = updated_goal.get("id")
        goal = db.query(Goal).filter(Goal.id == goal_id, Goal.sheet_id == sheet.id).first()
        if goal:
            if "target" in updated_goal and goal.target != updated_goal["target"]:
                log_audit_event(db, goal.id, sheet.id, current_user.id, "MANAGER_EDIT", "target", str(goal.target), str(updated_goal["target"]), "Manager approval edit")
                goal.target = updated_goal["target"]
            if "weightage" in updated_goal and goal.weightage != updated_goal["weightage"]:
                log_audit_event(db, goal.id, sheet.id, current_user.id, "MANAGER_EDIT", "weightage", str(goal.weightage), str(updated_goal["weightage"]), "Manager approval edit")
                goal.weightage = updated_goal["weightage"]

    sheet.status = "approved"
    db.commit()

    # Async notification to employee
    if employee and employee.email:
        from app.models.cycle import GoalCycle
        cycle = db.query(GoalCycle).filter(GoalCycle.id == sheet.cycle_id).first()
        from app.services.email_service import notify_goal_approved
        background_tasks.add_task(
            notify_goal_approved,
            employee_email=employee.email,
            employee_name=employee.name,
            cycle_name=cycle.name if cycle else "Active Cycle"
        )

    return {"status": "approved"}

@router.patch("/sheets/{sheet_id}/return")
def return_sheet(sheet_id: UUID, payload: ReturnPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    employee = db.query(User).filter(User.id == sheet.employee_id).first()
    if employee.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to return this sheet")
    
    if sheet.status != "submitted":
        raise HTTPException(status_code=400, detail="Sheet must be submitted to be returned")
    
    sheet.status = "returned"
    sheet.manager_note = payload.note
    db.commit()

    # Async notification to employee
    if employee and employee.email:
        from app.models.cycle import GoalCycle
        cycle = db.query(GoalCycle).filter(GoalCycle.id == sheet.cycle_id).first()
        from app.services.email_service import notify_goal_returned
        background_tasks.add_task(
            notify_goal_returned,
            employee_email=employee.email,
            employee_name=employee.name,
            manager_name=current_user.name,
            note=payload.note or "Please revise weightages/targets.",
            cycle_name=cycle.name if cycle else "Active Cycle"
        )

    return {"status": "returned"}

@router.post("/goals/{goal_id}/checkin", response_model=CheckinCommentResponse)
def add_checkin(goal_id: UUID, payload: CheckinCommentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
    employee = db.query(User).filter(User.id == sheet.employee_id).first()
    if employee.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to check-in on this goal")
    
    checkin = CheckinComment(
        goal_id=goal_id,
        manager_id=current_user.id,
        quarter=payload.quarter,
        comment=payload.comment
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin

@router.get("/checkins/{employee_id}", response_model=List[CheckinCommentResponse])
def get_employee_checkins(employee_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    employee = db.query(User).filter(User.id == employee_id, User.manager_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=403, detail="Not a direct report")
    
    checkins = db.query(CheckinComment).filter(CheckinComment.manager_id == current_user.id).all()
    return checkins
