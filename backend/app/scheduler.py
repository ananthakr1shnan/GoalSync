from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.escalation_service import check_checkin_overdue, send_checkin_window_notifications

scheduler = AsyncIOScheduler()

def start_scheduler():
    """Starts the background task scheduler with daily cron triggers."""
    print("[Scheduler] Initializing APScheduler background tasks...")
    
    # Scheduled job to check overdue checkins daily at 09:00
    scheduler.add_job(
        check_checkin_overdue,
        CronTrigger(hour=9, minute=0),
        id="check_checkin_overdue",
        replace_existing=True
    )
    
    # Scheduled job to send window open/reminders daily at 08:00
    scheduler.add_job(
        send_checkin_window_notifications,
        CronTrigger(hour=8, minute=0),
        id="send_checkin_window_notifications",
        replace_existing=True
    )
    
    scheduler.start()
    print("[Scheduler] Scheduler started successfully.")

def stop_scheduler():
    """Gracefully shuts down the background task scheduler."""
    print("[Scheduler] Shutting down scheduler...")
    try:
        scheduler.shutdown()
        print("[Scheduler] Scheduler shut down successfully.")
    except Exception as e:
        print(f"[Scheduler Error] Error shutting down scheduler: {e}")
