import os
import sys
from datetime import date
from decimal import Decimal

# Add the backend directory to python path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.cycle import GoalCycle
from app.models.goal_sheet import GoalSheet
from app.models.goal import Goal
from app.core.security import get_password_hash

def seed_db():
    print("Creating all tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("Connecting to DB...")
    db = SessionLocal()
    
    try:
        print("Checking users...")
        # Check if users already exist
        admin = db.query(User).filter(User.email == "admin@goalsync.demo").first()
        if not admin:
            print("Creating users...")
            admin = User(
                name="Admin User",
                email="admin@goalsync.demo",
                password_hash=get_password_hash("Demo@1234"),
                role="admin",
                department="HR"
            )
            db.add(admin)
            
            manager = User(
                name="Sarah Manager",
                email="manager@goalsync.demo",
                password_hash=get_password_hash("Demo@1234"),
                role="manager",
                department="Sales"
            )
            db.add(manager)
            db.flush() # get manager id
            
            emp1 = User(
                name="John Employee",
                email="employee@goalsync.demo",
                password_hash=get_password_hash("Demo@1234"),
                role="employee",
                department="Sales",
                manager_id=manager.id
            )
            emp2 = User(
                name="Alice Employee",
                email="alice@goalsync.demo",
                password_hash=get_password_hash("Demo@1234"),
                role="employee",
                department="Sales",
                manager_id=manager.id
            )
            db.add(emp1)
            db.add(emp2)
            db.flush()
        else:
            manager = db.query(User).filter(User.email == "manager@goalsync.demo").first()
            emp1 = db.query(User).filter(User.email == "employee@goalsync.demo").first()
        
        print("Checking cycles...")
        cycle = db.query(GoalCycle).filter(GoalCycle.name == "FY 2025-26").first()
        if not cycle:
            print("Creating cycle...")
            cycle = GoalCycle(
                name="FY 2025-26",
                is_active=True,
                goal_setting_open=date(2025, 5, 1),
                goal_setting_close=date(2025, 6, 30),
                q1_open=date(2025, 7, 1),
                q1_close=date(2025, 7, 31),
                q2_open=date(2025, 10, 1),
                q2_close=date(2025, 10, 31),
                q3_open=date(2026, 1, 1),
                q3_close=date(2026, 1, 31),
                q4_open=date(2026, 3, 1),
                q4_close=date(2026, 4, 30)
            )
            db.add(cycle)
            db.flush()
            
        print("Checking goal sheets...")
        if emp1:
            sheet = db.query(GoalSheet).filter(GoalSheet.employee_id == emp1.id, GoalSheet.cycle_id == cycle.id).first()
            if not sheet:
                print("Creating demo goal sheet for John...")
                sheet = GoalSheet(
                    employee_id=emp1.id,
                    cycle_id=cycle.id,
                    status="locked"
                )
                db.add(sheet)
                db.flush()
                
                goals = [
                    Goal(sheet_id=sheet.id, title="Increase Sales Revenue", thrust_area="Financial", uom="numeric_max", target=Decimal("100000"), weightage=Decimal("40")),
                    Goal(sheet_id=sheet.id, title="Acquire New Logos", thrust_area="Customer", uom="numeric_max", target=Decimal("25"), weightage=Decimal("30")),
                    Goal(sheet_id=sheet.id, title="Complete Security Training", thrust_area="Process", uom="timeline", target=Decimal("1"), target_date=date(2025, 9, 30), weightage=Decimal("30"))
                ]
                db.add_all(goals)
        
        db.commit()
        print("Database seeded successfully.")

    except Exception as e:
        print(f"Error seeding DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
