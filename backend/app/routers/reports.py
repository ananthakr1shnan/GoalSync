from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import csv
import io

from app.database import get_db
from app.core.dependencies import require_manager
from app.models.user import User
from app.models.goal_sheet import GoalSheet
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.audit_log import GoalAuditLog

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/achievement")
def get_achievement_report(
    cycle_id: str,
    department: Optional[str] = None,
    quarter: Optional[str] = None,
    db: Session = Depends(get_db),
    accept: Optional[str] = Header(None),
    current_user: User = Depends(require_manager)
):
    try:
        cycle_uuid = UUID(cycle_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cycle ID format.")

    # 1. Fetch employees
    emp_query = db.query(User).filter(User.role == "employee")
    if department:
        emp_query = emp_query.filter(User.department == department)
    employees = emp_query.all()

    report_data = []

    for emp in employees:
        sheet = db.query(GoalSheet).filter(
            GoalSheet.employee_id == emp.id,
            GoalSheet.cycle_id == cycle_uuid
        ).first()

        goals_data = []
        if sheet:
            for g in sheet.goals:
                # Find achievement for selected quarter
                ach_query = db.query(Achievement).filter(Achievement.goal_id == g.id)
                if quarter:
                    ach_query = ach_query.filter(Achievement.quarter == quarter)
                
                # Fetch latest matching achievement
                ach = ach_query.order_by(Achievement.quarter.desc()).first()

                goals_data.append({
                    "title": g.title,
                    "target": float(g.target),
                    "actual": float(ach.actual) if ach and ach.actual is not None else None,
                    "progress_score": g.progress_score,
                    "status": ach.status if ach else "not_started"
                })

        report_data.append({
            "employee": emp.name,
            "department": emp.department or "Operations",
            "goals": goals_data
        })

    # 2. Support CSV streaming download
    if accept and "text/csv" in accept:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Employee", "Department", "Goal Title", "Target", "Actual", "Progress Score", "Status"])
        
        for item in report_data:
            if not item["goals"]:
                # Write employee row even if no goals exist
                writer.writerow([item["employee"], item["department"], "No goals defined", "", "", 0.0, "not_started"])
            else:
                for g in item["goals"]:
                    writer.writerow([
                        item["employee"],
                        item["department"],
                        g["title"],
                        g["target"],
                        g["actual"] if g["actual"] is not None else "",
                        g["progress_score"],
                        g["status"]
                    ])
                    
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=achievement_report_{cycle_id}.csv"}
        )

    return report_data

@router.get("/completion-dashboard")
def get_completion_dashboard(
    cycle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    try:
        cycle_uuid = UUID(cycle_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cycle ID format.")

    # Get distinct departments for employees
    distinct_depts = [
        d[0] for d in db.query(User.department)
        .filter(User.role == "employee")
        .distinct()
        .all()
        if d[0]
    ]
    if not distinct_depts:
        distinct_depts = ["Operations", "Sales", "HR", "Engineering"]

    dashboard_data = []

    for dept in distinct_depts:
        employees = db.query(User).filter(
            User.role == "employee",
            User.department == dept
        ).all()

        total_emp = len(employees)
        if total_emp == 0:
            dashboard_data.append({
                "department": dept,
                "q1_pct": 0.0,
                "q2_pct": 0.0,
                "q3_pct": 0.0,
                "q4_pct": 0.0,
                "goal_setting_pct": 0.0
            })
            continue

        # 1. Goal setting percentage (sheets submitted, approved, or locked)
        sheets_submitted = 0
        dept_goals = []

        for emp in employees:
            sheet = db.query(GoalSheet).filter(
                GoalSheet.employee_id == emp.id,
                GoalSheet.cycle_id == cycle_uuid
            ).first()

            if sheet:
                if sheet.status in ["submitted", "approved", "locked"]:
                    sheets_submitted += 1
                dept_goals.extend(sheet.goals)

        goal_setting_pct = (sheets_submitted / total_emp) * 100
        total_goals = len(dept_goals)

        # 2. Quarterly performance percentages
        q_pcts = {}
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            if total_goals == 0:
                q_pcts[q.lower()] = 0.0
                continue

            logged_count = 0
            for g in dept_goals:
                ach = db.query(Achievement).filter(
                    Achievement.goal_id == g.id,
                    Achievement.quarter == q
                ).first()
                if ach and ach.actual is not None:
                    logged_count += 1

            q_pcts[q.lower()] = (logged_count / total_goals) * 100

        dashboard_data.append({
            "department": dept,
            "q1_pct": round(q_pcts["q1"], 1),
            "q2_pct": round(q_pcts["q2"], 1),
            "q3_pct": round(q_pcts["q3"], 1),
            "q4_pct": round(q_pcts["q4"], 1),
            "goal_setting_pct": round(goal_setting_pct, 1)
        })

    return dashboard_data

@router.get("/audit-log")
def get_audit_log(
    page: int = 1,
    page_size: int = 50,
    goal_id: Optional[str] = None,
    changed_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    query = db.query(GoalAuditLog)

    if goal_id:
        try:
            query = query.filter(GoalAuditLog.goal_id == UUID(goal_id))
        except ValueError:
            pass
    if changed_by:
        try:
            query = query.filter(GoalAuditLog.changed_by == UUID(changed_by))
        except ValueError:
            pass
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(GoalAuditLog.changed_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(GoalAuditLog.changed_at <= dt_to)
        except ValueError:
            pass

    total = query.count()
    items = query.order_by(GoalAuditLog.changed_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items_data = []
    for item in items:
        user_obj = db.query(User).filter(User.id == item.changed_by).first()
        goal_obj = db.query(Goal).filter(Goal.id == item.goal_id).first()

        items_data.append({
            "id": str(item.id),
            "goal_id": str(item.goal_id),
            "sheet_id": str(item.sheet_id),
            "changed_by": str(item.changed_by),
            "changed_by_name": user_obj.name if user_obj else "Unknown Auditor",
            "action": item.action,
            "field_name": item.field_name,
            "old_value": item.old_value,
            "new_value": item.new_value,
            "reason": item.reason,
            "changed_at": item.changed_at.isoformat() if item.changed_at else None,
            "goal_title": goal_obj.title if goal_obj else "Strategic Corporate Objective"
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items_data
    }
