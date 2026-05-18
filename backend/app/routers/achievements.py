from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.goal_sheet import GoalSheet
from app.schemas.goal import AchievementCreate, AchievementResponse

router = APIRouter(prefix="/achievements", tags=["achievements"])

@router.get("/{sheet_id}", response_model=List[AchievementResponse])
def get_achievements(sheet_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    goal_ids = [g.id for g in sheet.goals]
    achievements = db.query(Achievement).filter(Achievement.goal_id.in_(goal_ids)).all()
    return achievements

@router.post("/{goal_id}/{quarter}", response_model=AchievementResponse)
def upsert_achievement(goal_id: UUID, quarter: str, payload: AchievementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.cycle import GoalCycle
    from datetime import date
    
    cycle = db.query(GoalCycle).filter(GoalCycle.is_active == True).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="No active goal cycle found.")
        
    q = quarter.lower()
    open_date = getattr(cycle, f"{q}_open", None)
    close_date = getattr(cycle, f"{q}_close", None)
    
    if not open_date or not close_date:
        raise HTTPException(status_code=400, detail=f"Invalid check-in window for quarter {quarter}.")
        
    today = date.today()
    if not (open_date <= today <= close_date):
        raise HTTPException(
            status_code=400, 
            detail=f"Check-in window for {quarter} is currently closed. (Open: {open_date} to {close_date})"
        )

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id, GoalSheet.employee_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    achievement = db.query(Achievement).filter(Achievement.goal_id == goal_id, Achievement.quarter == quarter).first()
    if achievement:
        achievement.actual = payload.actual
        achievement.actual_date = payload.actual_date
        achievement.status = payload.status
        achievement.notes = payload.notes
        achievement.updated_by = current_user.id
    else:
        achievement = Achievement(
            goal_id=goal_id,
            quarter=quarter,
            actual=payload.actual,
            actual_date=payload.actual_date,
            status=payload.status,
            notes=payload.notes,
            updated_by=current_user.id
        )
        db.add(achievement)
    
    db.commit()
    db.refresh(achievement)
    return achievement
