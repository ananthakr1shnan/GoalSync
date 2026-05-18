from sqlalchemy.orm import Session
from uuid import UUID
from app.models.audit_log import GoalAuditLog

def log_audit_event(
    db: Session,
    goal_id: UUID,
    sheet_id: UUID,
    changed_by: UUID,
    action: str,
    field_name: str = None,
    old_value: str = None,
    new_value: str = None,
    reason: str = None
):
    audit_log = GoalAuditLog(
        goal_id=goal_id,
        sheet_id=sheet_id,
        changed_by=changed_by,
        action=action,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        reason=reason
    )
    db.add(audit_log)
