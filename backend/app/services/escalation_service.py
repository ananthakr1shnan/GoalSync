from datetime import date, timedelta
from app.database import SessionLocal
from app.models.cycle import GoalCycle
from app.models.user import User
from app.models.goal_sheet import GoalSheet
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.escalation_log import EscalationLog
from app.core.config import config
from app.services.email_service import (
    notify_escalation,
    notify_checkin_window_open,
    notify_checkin_reminder
)

async def check_checkin_overdue() -> None:
    """
    Scheduled job. Detects employees who haven't completed their quarterly check-ins
    and escalates to their managers after threshold days.
    """
    if not config.ESCALATION_ENABLED:
        print("[Escalation] Escalation engine disabled.")
        return

    print("[Escalation] Running check_checkin_overdue scheduled job...")
    db = SessionLocal()
    try:
        # 1. Get active cycle
        cycle = db.query(GoalCycle).filter(GoalCycle.is_active == True).first()
        if not cycle:
            print("[Escalation] No active goal cycle found.")
            return

        today = date.today()
        
        # 2. Check each quarter (Q1-Q4)
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            q_lower = q.lower()
            open_date = getattr(cycle, f"{q_lower}_open")
            close_date = getattr(cycle, f"{q_lower}_close")
            
            if not open_date or not close_date:
                continue
                
            # If target window is currently open OR closed within last 7 days grace period
            is_open = today >= open_date and today <= close_date
            is_recent_closed = close_date < today <= (close_date + timedelta(days=7))
            
            if is_open or is_recent_closed:
                # Get all employees
                employees = db.query(User).filter(User.role == "employee", User.is_active == True).all()
                
                for emp in employees:
                    # Find approved/locked sheet
                    sheet = db.query(GoalSheet).filter(
                        GoalSheet.employee_id == emp.id,
                        GoalSheet.cycle_id == cycle.id,
                        GoalSheet.status.in_(["approved", "locked"])
                    ).first()
                    
                    if not sheet or not sheet.goals:
                        continue
                        
                    # Check if they have at least one logged achievement actual for this quarter
                    goal_ids = [g.id for g in sheet.goals]
                    has_ach = db.query(Achievement).filter(
                        Achievement.goal_id.in_(goal_ids),
                        Achievement.quarter == q,
                        Achievement.actual.isnot(None)
                    ).first()
                    
                    if not has_ach:
                        days_overdue = (today - open_date).days
                        
                        if days_overdue >= config.ESCALATION_THRESHOLD_DAYS:
                            # Verify if already escalated
                            existing = db.query(EscalationLog).filter(
                                EscalationLog.employee_id == emp.id,
                                EscalationLog.cycle_id == cycle.id,
                                EscalationLog.quarter == q,
                                EscalationLog.escalation_type == "checkin_overdue"
                            ).first()
                            
                            if not existing and emp.manager_id:
                                manager = db.query(User).filter(User.id == emp.manager_id).first()
                                if manager and manager.email:
                                    print(f"[Escalation] Overdue checkin for {emp.name} in {q}. Escalating to manager {manager.name}.")
                                    # Send email
                                    await notify_escalation(
                                        manager_email=manager.email,
                                        manager_name=manager.name,
                                        employee_name=emp.name,
                                        quarter=q,
                                        days_overdue=days_overdue
                                    )
                                    # Log escalation
                                    log_entry = EscalationLog(
                                        employee_id=emp.id,
                                        manager_id=manager.id,
                                        cycle_id=cycle.id,
                                        quarter=q,
                                        escalation_type="checkin_overdue"
                                    )
                                    db.add(log_entry)
                                    db.commit()
    except Exception as e:
        print(f"[Escalation Error] check_checkin_overdue failed: {e}")
    finally:
        db.close()

async def send_checkin_window_notifications() -> None:
    """
    Scheduled job. Dispatches notifications upon window open
    and reminders 3 days prior to window close.
    """
    if not config.ESCALATION_ENABLED:
        print("[Escalation Window Notify] Escalation engine disabled.")
        return

    print("[Escalation Window Notify] Running send_checkin_window_notifications...")
    db = SessionLocal()
    try:
        cycle = db.query(GoalCycle).filter(GoalCycle.is_active == True).first()
        if not cycle:
            print("[Escalation Window Notify] No active goal cycle found.")
            return

        today = date.today()
        
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            q_lower = q.lower()
            open_date = getattr(cycle, f"{q_lower}_open")
            close_date = getattr(cycle, f"{q_lower}_close")
            
            if not open_date or not close_date:
                continue
            
            # 1. Window open notifications
            if today == open_date:
                employees = db.query(User).filter(User.role == "employee", User.is_active == True).all()
                for emp in employees:
                    sheet = db.query(GoalSheet).filter(
                        GoalSheet.employee_id == emp.id,
                        GoalSheet.cycle_id == cycle.id,
                        GoalSheet.status.in_(["approved", "locked"])
                    ).first()
                    
                    if not sheet:
                        continue
                    
                    # Prevent duplicate
                    existing = db.query(EscalationLog).filter(
                        EscalationLog.employee_id == emp.id,
                        EscalationLog.cycle_id == cycle.id,
                        EscalationLog.quarter == q,
                        EscalationLog.escalation_type == "window_open"
                    ).first()
                    
                    if not existing and emp.email:
                        print(f"[Escalation] Sending window open notification for {q} to {emp.name}.")
                        await notify_checkin_window_open(
                            employee_email=emp.email,
                            employee_name=emp.name,
                            quarter=q,
                            close_date=str(close_date)
                        )
                        log_entry = EscalationLog(
                            employee_id=emp.id,
                            manager_id=emp.manager_id or emp.id,
                            cycle_id=cycle.id,
                            quarter=q,
                            escalation_type="window_open"
                        )
                        db.add(log_entry)
                        db.commit()
            
            # 2. Window close reminder (3 days before closing)
            elif today == (close_date - timedelta(days=3)):
                employees = db.query(User).filter(User.role == "employee", User.is_active == True).all()
                for emp in employees:
                    sheet = db.query(GoalSheet).filter(
                        GoalSheet.employee_id == emp.id,
                        GoalSheet.cycle_id == cycle.id,
                        GoalSheet.status.in_(["approved", "locked"])
                    ).first()
                    
                    if not sheet or not sheet.goals:
                        continue
                    
                    # Verify if they completed checkin
                    goal_ids = [g.id for g in sheet.goals]
                    has_ach = db.query(Achievement).filter(
                        Achievement.goal_id.in_(goal_ids),
                        Achievement.quarter == q,
                        Achievement.actual.isnot(None)
                    ).first()
                    
                    if not has_ach:
                        # Prevent duplicate
                        existing = db.query(EscalationLog).filter(
                            EscalationLog.employee_id == emp.id,
                            EscalationLog.cycle_id == cycle.id,
                            EscalationLog.quarter == q,
                            EscalationLog.escalation_type == "checkin_reminder"
                        ).first()
                        
                        if not existing and emp.email:
                            print(f"[Escalation] Sending checkin reminder for {q} to {emp.name}.")
                            await notify_checkin_reminder(
                                employee_email=emp.email,
                                employee_name=emp.name,
                                quarter=q,
                                days_left=3
                            )
                            log_entry = EscalationLog(
                                employee_id=emp.id,
                                manager_id=emp.manager_id or emp.id,
                                cycle_id=cycle.id,
                                quarter=q,
                                escalation_type="checkin_reminder"
                            )
                            db.add(log_entry)
                            db.commit()
    except Exception as e:
        print(f"[Escalation Error] send_checkin_window_notifications failed: {e}")
    finally:
        db.close()
