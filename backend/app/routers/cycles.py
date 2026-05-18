from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.cycle import GoalCycle
from app.schemas.cycle import GoalCycleResponse

router = APIRouter(prefix="/cycles", tags=["cycles"])

@router.get("/active", response_model=GoalCycleResponse)
def get_active_cycle(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    cycle = db.query(GoalCycle).filter(GoalCycle.is_active == True).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="No active cycle found")
    return cycle
