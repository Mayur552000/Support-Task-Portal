from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.db.excel_repository import repository
from app.core.config import settings

def get_active_notifications(agent_id: str) -> List[Dict[str, Any]]:
    """Evaluates rules for overdue tasks, stale tickets, and upcoming follow-ups."""
    notifications = []
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")

    # 1. Overdue Tasks
    tasks = repository.get_tasks(assignee_id=agent_id)
    overdue_count = 0
    for t in tasks:
        if t.status not in ["Completed", "Cancelled"]:
            try:
                due_dt = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                if due_dt < today:
                    overdue_count += 1
                elif due_dt == today:
                    notifications.append({
                        "id": f"notif-due-{t.task_id}",
                        "type": "warning",
                        "category": "Task",
                        "title": "Task Due Today",
                        "message": f"Task '{t.title}' ({t.task_id}) is due today.",
                        "timestamp": "Just now",
                        "item_id": t.task_id
                    })
            except Exception:
                pass

    if overdue_count > 0:
        notifications.append({
            "id": "notif-overdue-summary",
            "type": "error",
            "category": "Task",
            "title": "Overdue Tasks Alert",
            "message": f"You have {overdue_count} overdue task(s) requiring attention.",
            "timestamp": "Active",
            "item_id": "my-tasks"
        })

    # 2. Stale Tickets (No update for > N days)
    tickets = repository.get_tickets(agent_id=agent_id)
    stale_threshold = today - timedelta(days=settings.STALE_TICKET_DAYS)
    for tk in tickets:
        if tk.status not in ["Resolved", "Closed"]:
            last_upd_date = None
            if tk.updates:
                try:
                    last_upd_date = datetime.strptime(tk.updates[-1].timestamp[:10], "%Y-%m-%d").date()
                except Exception:
                    pass
            elif tk.updated_at:
                try:
                    last_upd_date = datetime.strptime(tk.updated_at[:10], "%Y-%m-%d").date()
                except Exception:
                    pass

            if last_upd_date and last_upd_date <= stale_threshold:
                days_diff = (today - last_upd_date).days
                notifications.append({
                    "id": f"notif-stale-{tk.ticket_id}",
                    "type": "warning",
                    "category": "Ticket",
                    "title": "Stale Ticket Warning",
                    "message": f"Ticket {tk.ticket_id} ('{tk.subject[:35]}...') has not been updated for {days_diff} days.",
                    "timestamp": f"{days_diff}d ago",
                    "item_id": tk.ticket_id
                })

    # 3. Upcoming Follow-up Dates
    for tk in tickets:
        for upd in tk.updates:
            if upd.follow_up_date:
                try:
                    f_date = datetime.strptime(upd.follow_up_date, "%Y-%m-%d").date()
                    if f_date == today:
                        notifications.append({
                            "id": f"notif-fup-{upd.update_id}",
                            "type": "info",
                            "category": "Follow-up",
                            "title": "Follow-up Scheduled Today",
                            "message": f"Follow-up for {tk.ticket_id}: '{upd.next_action or 'Review status'}'",
                            "timestamp": "Today",
                            "item_id": tk.ticket_id
                        })
                except Exception:
                    pass

    return notifications
