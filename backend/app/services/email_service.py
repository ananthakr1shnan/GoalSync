import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader
from app.core.config import config

# Set up templates directory
TEMPLATE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "templates",
    "email"
)
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def render_template(template_name: str, **kwargs) -> str:
    """Helper to render Jinja2 HTML email templates."""
    try:
        template = jinja_env.get_template(template_name)
        return template.render(**kwargs)
    except Exception as e:
        print(f"Error rendering email template {template_name}: {e}")
        return ""

async def send_email(to: str, subject: str, html_body: str) -> None:
    """
    Core sending function. Reads environment variables from app config.
    Logs and swallows all SMTP exceptions to prevent disrupting main request workflows.
    """
    if not config.EMAIL_ENABLED:
        print(f"[Email Skipped] EMAIL_ENABLED is set to False. To: {to}, Subject: {subject}")
        return

    print(f"[SMTP Connect] Connecting to smtp.gmail.com:587 to send email to {to}...")
    
    # Construct multipart MIME message
    message = MIMEMultipart("alternative")
    message["From"] = f"{config.GMAIL_FROM_NAME} <{config.GMAIL_USER}>"
    message["To"] = to
    message["Subject"] = subject
    
    html_part = MIMEText(html_body, "html")
    message.attach(html_part)
    
    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            username=config.GMAIL_USER,
            password=config.GMAIL_APP_PASSWORD,
            start_tls=True,
            timeout=10
        )
        print(f"[SMTP Success] Email successfully sent to {to}!")
    except Exception as e:
        print(f"[SMTP Error] Failed to send email to {to}: {e}")

# --- Async Notification Triggers ---

async def notify_goal_submitted(employee_name: str, manager_email: str, manager_name: str, cycle_name: str) -> None:
    """Sent to manager when employee submits goal sheet."""
    review_url = f"{config.FRONTEND_URL}/team"
    html = render_template(
        "goal_submitted.html",
        manager_name=manager_name,
        employee_name=employee_name,
        cycle_name=cycle_name,
        review_url=review_url
    )
    subject = f"Action Required: {employee_name} has submitted their goals for {cycle_name}"
    await send_email(manager_email, subject, html)

async def notify_goal_approved(employee_email: str, employee_name: str, cycle_name: str) -> None:
    """Sent to employee when manager approves their goal sheet."""
    view_url = f"{config.FRONTEND_URL}/my-goals"
    html = render_template(
        "goal_approved.html",
        employee_name=employee_name,
        cycle_name=cycle_name,
        view_url=view_url
    )
    subject = f"Your goals for {cycle_name} have been approved ✓"
    await send_email(employee_email, subject, html)

async def notify_goal_returned(employee_email: str, employee_name: str, manager_name: str, note: str, cycle_name: str) -> None:
    """Sent to employee when manager returns goal sheet for rework."""
    edit_url = f"{config.FRONTEND_URL}/my-goals"
    html = render_template(
        "goal_returned.html",
        employee_name=employee_name,
        manager_name=manager_name,
        note=note,
        edit_url=edit_url
    )
    subject = "Your goal sheet has been returned for revision"
    await send_email(employee_email, subject, html)

async def notify_checkin_window_open(employee_email: str, employee_name: str, quarter: str, close_date: str) -> None:
    """Sent to employee when a check-in window opens."""
    checkin_url = f"{config.FRONTEND_URL}/my-goals"
    html = render_template(
        "checkin_window_open.html",
        employee_name=employee_name,
        quarter=quarter,
        close_date=close_date,
        checkin_url=checkin_url
    )
    subject = f"{quarter} Check-in Window is Now Open"
    await send_email(employee_email, subject, html)

async def notify_checkin_reminder(employee_email: str, employee_name: str, quarter: str, days_left: int) -> None:
    """Reminder sent 3 days before check-in window closes."""
    checkin_url = f"{config.FRONTEND_URL}/my-goals"
    html = render_template(
        "checkin_reminder.html",
        employee_name=employee_name,
        quarter=quarter,
        days_left=days_left,
        checkin_url=checkin_url
    )
    subject = f"Reminder: {days_left} days left to complete your {quarter} check-in"
    await send_email(employee_email, subject, html)

async def notify_escalation(manager_email: str, manager_name: str, employee_name: str, quarter: str, days_overdue: int) -> None:
    """Sent to manager when employee has not completed check-in after N days."""
    team_url = f"{config.FRONTEND_URL}/team"
    html = render_template(
        "escalation.html",
        manager_name=manager_name,
        employee_name=employee_name,
        quarter=quarter,
        days_overdue=days_overdue,
        team_url=team_url
    )
    subject = f"⚠ Escalation: {employee_name} has not completed {quarter} check-in"
    await send_email(manager_email, subject, html)
