from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Dict, Any
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.goal_sheet import GoalSheet
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.cycle import GoalCycle
from app.services.progress import compute_progress

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_scoped_employee_ids(db: Session, current_user: User) -> List[UUID]:
    """Helper to enforce manager/admin security scoping boundaries."""
    if current_user.role == "admin":
        employees = db.query(User).filter(User.role == "employee").all()
        return [e.id for e in employees]
    elif current_user.role == "manager":
        reports = db.query(User).filter(User.manager_id == current_user.id).all()
        return [r.id for r in reports]
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee accounts are not authorized to view analytics dashboard."
        )

# --- 1. Overview Dashboard Metrics ---
@router.get("/overview")
def get_analytics_overview(cycle_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scoped_ids = get_scoped_employee_ids(db, current_user)
    if not scoped_ids:
        return {
            "total_employees": 0, "sheets_submitted": 0, "sheets_approved": 0, "sheets_pending": 0,
            "avg_progress_score": 0.0,
            "completion_by_quarter": {
                "Q1": {"total": 0, "completed": 0, "pct": 0.0},
                "Q2": {"total": 0, "completed": 0, "pct": 0.0},
                "Q3": {"total": 0, "completed": 0, "pct": 0.0},
                "Q4": {"total": 0, "completed": 0, "pct": 0.0}
            }
        }

    # Fetch sheets
    sheets = db.query(GoalSheet).filter(
        GoalSheet.cycle_id == cycle_id,
        GoalSheet.employee_id.in_(scoped_ids)
    ).all()

    total_emp = len(scoped_ids)
    sheets_submitted = sum(1 for s in sheets if s.status == "submitted")
    sheets_approved = sum(1 for s in sheets if s.status in ["approved", "locked"])
    sheets_pending = sum(1 for s in sheets if s.status in ["draft", "returned"])

    # Avg progress score across all goals in approved/locked sheets
    all_goals = []
    approved_sheets = [s for s in sheets if s.status in ["approved", "locked"]]
    
    for s in approved_sheets:
        all_goals.extend(s.goals)
        
    avg_progress = 0.0
    if all_goals:
        avg_progress = sum(g.progress_score for g in all_goals) / len(all_goals)

    # Quarterly completion
    completion_by_quarter = {}
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        total_sheets = len(approved_sheets)
        completed_sheets = 0
        
        for s in approved_sheets:
            goal_ids = [g.id for g in s.goals]
            has_checkin = db.query(Achievement).filter(
                Achievement.goal_id.in_(goal_ids),
                Achievement.quarter == q,
                Achievement.actual.isnot(None)
            ).first()
            if has_checkin:
                completed_sheets += 1
                
        pct = (completed_sheets / total_sheets * 100) if total_sheets > 0 else 0.0
        completion_by_quarter[q] = {
            "total": total_sheets,
            "completed": completed_sheets,
            "pct": round(pct, 1)
        }

    return {
        "total_employees": total_emp,
        "sheets_submitted": sheets_submitted,
        "sheets_approved": sheets_approved,
        "sheets_pending": sheets_pending,
        "avg_progress_score": round(avg_progress, 1),
        "completion_by_quarter": completion_by_quarter
    }

# --- 2. Progress Distribution (Histogram) ---
@router.get("/progress-distribution")
def get_progress_distribution(cycle_id: UUID, quarter: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scoped_ids = get_scoped_employee_ids(db, current_user)
    buckets = [
        {"range": "0-25%", "count": 0},
        {"range": "26-50%", "count": 0},
        {"range": "51-75%", "count": 0},
        {"range": "76-100%", "count": 0}
    ]
    
    if not scoped_ids:
        return buckets

    sheets = db.query(GoalSheet).filter(
        GoalSheet.cycle_id == cycle_id,
        GoalSheet.employee_id.in_(scoped_ids),
        GoalSheet.status.in_(["approved", "locked"])
    ).all()

    for s in sheets:
        if not s.goals:
            continue
            
        # Calculate employee average score
        scores = []
        for g in s.goals:
            if quarter:
                ach = db.query(Achievement).filter(Achievement.goal_id == g.id, Achievement.quarter == quarter).first()
                if ach and ach.actual is not None:
                    scores.append(compute_progress(g.uom, g.target, ach.actual))
                else:
                    scores.append(0.0)
            else:
                scores.append(g.progress_score)
                
        avg_score = sum(scores) / len(scores) if scores else 0.0
        
        if avg_score <= 25:
            buckets[0]["count"] += 1
        elif avg_score <= 50:
            buckets[1]["count"] += 1
        elif avg_score <= 75:
            buckets[2]["count"] += 1
        else:
            buckets[3]["count"] += 1

    return buckets

# --- 3. Thrust Area breakdown ---
@router.get("/thrust-area-breakdown")
def get_thrust_area_breakdown(cycle_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scoped_ids = get_scoped_employee_ids(db, current_user)
    if not scoped_ids:
        return []

    sheets = db.query(GoalSheet).filter(
        GoalSheet.cycle_id == cycle_id,
        GoalSheet.employee_id.in_(scoped_ids),
        GoalSheet.status.in_(["approved", "locked"])
    ).all()

    thrust_map = {}
    for s in sheets:
        for g in s.goals:
            ta = g.thrust_area or "Unassigned"
            if ta not in thrust_map:
                thrust_map[ta] = {"goals": [], "weightages": []}
            thrust_map[ta]["goals"].append(g.progress_score)
            thrust_map[ta]["weightages"].append(g.weightage)

    results = []
    for ta, data in thrust_map.items():
        avg_progress = sum(data["goals"]) / len(data["goals"]) if data["goals"] else 0.0
        avg_weight = sum(data["weightages"]) / len(data["weightages"]) if data["weightages"] else 0.0
        results.append({
            "thrust_area": ta,
            "goal_count": len(data["goals"]),
            "avg_progress": round(avg_progress, 1),
            "avg_weightage": round(avg_weight, 1)
        })

    return results

# --- 4. Department Comparison ---
@router.get("/department-comparison")
def get_department_comparison(cycle_id: UUID, quarter: str = "Q1", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scoped_ids = get_scoped_employee_ids(db, current_user)
    if not scoped_ids:
        return []

    # Get users of interest
    employees = db.query(User).filter(User.id.in_(scoped_ids)).all()
    
    dept_map = {}
    for emp in employees:
        dept = emp.department or "General"
        if dept not in dept_map:
            dept_map[dept] = []
        dept_map[dept].append(emp)

    results = []
    for dept, emps in dept_map.items():
        emp_ids = [e.id for e in emps]
        
        # Approved sheets
        sheets = db.query(GoalSheet).filter(
            GoalSheet.cycle_id == cycle_id,
            GoalSheet.employee_id.in_(emp_ids),
            GoalSheet.status.in_(["approved", "locked"])
        ).all()
        
        all_goals = []
        completed_checkins = 0
        total_sheets = len(sheets)
        
        for s in sheets:
            all_goals.extend(s.goals)
            
            # Check quarterly checkin completion
            goal_ids = [g.id for g in s.goals]
            has_ach = db.query(Achievement).filter(
                Achievement.goal_id.in_(goal_ids),
                Achievement.quarter == quarter,
                Achievement.actual.isnot(None)
            ).first()
            if has_ach:
                completed_checkins += 1

        avg_progress = 0.0
        if all_goals:
            avg_progress = sum(g.progress_score for g in all_goals) / len(all_goals)
            
        completion_pct = (completed_checkins / total_sheets * 100) if total_sheets > 0 else 0.0
        
        results.append({
            "department": dept,
            "employee_count": len(emps),
            "avg_progress": round(avg_progress, 1),
            "checkin_completion_pct": round(completion_pct, 1)
        })

    return results

# --- 5. Quarterly Progress Trend ---
@router.get("/trend")
def get_analytics_trend(cycle_id: UUID, department: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scoped_ids = get_scoped_employee_ids(db, current_user)
    if not scoped_ids:
        return []

    # Optional department filter
    if department:
        employees = db.query(User).filter(User.id.in_(scoped_ids), User.department == department).all()
        scoped_ids = [e.id for e in employees]

    sheets = db.query(GoalSheet).filter(
        GoalSheet.cycle_id == cycle_id,
        GoalSheet.employee_id.in_(scoped_ids),
        GoalSheet.status.in_(["approved", "locked"])
    ).all()

    trend = []
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        total_progress = 0.0
        goal_count = 0
        reported_employees = set()

        for s in sheets:
            for g in s.goals:
                ach = db.query(Achievement).filter(
                    Achievement.goal_id == g.id,
                    Achievement.quarter == q,
                    Achievement.actual.isnot(None)
                ).first()
                
                if ach:
                    prog = compute_progress(g.uom, g.target, ach.actual)
                    total_progress += prog
                    goal_count += 1
                    reported_employees.add(s.employee_id)

        avg_prog = (total_progress / goal_count) if goal_count > 0 else 0.0
        trend.append({
            "quarter": q,
            "avg_progress": round(avg_prog, 1),
            "employees_reported": len(reported_employees)
        })

    return trend
