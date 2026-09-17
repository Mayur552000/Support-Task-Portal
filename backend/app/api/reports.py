from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from app.db.models import UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/agent")
def get_agent_workload_report(current_user: UserRead = Depends(get_current_user)) -> List[Dict[str, Any]]:
    users = repository.get_users()
    tickets_all = repository.get_tickets()
    tasks_all = repository.get_tasks()

    report = []
    for u in users:
        u_id = str(u.get("user_id"))
        u_name = str(u.get("full_name"))
        
        agent_tickets = [t for t in tickets_all if t.assigned_agent_id == u_id]
        agent_tasks = [t for t in tasks_all if t.assignee_id == u_id]

        open_tickets = sum(1 for t in agent_tickets if t.status not in ["Resolved", "Closed"])
        open_tasks = sum(1 for t in agent_tasks if t.status not in ["Completed", "Cancelled"])
        overdue_tasks = sum(1 for t in agent_tasks if t.is_overdue)
        
        updates_count = sum(len(t.updates) for t in agent_tickets) + sum(len(t.updates) for t in agent_tasks)
        completed_items = sum(1 for t in agent_tickets if t.status in ["Resolved", "Closed"]) + sum(1 for t in agent_tasks if t.status == "Completed")

        report.append({
            "agent_id": u_id,
            "agent_name": u_name,
            "role": str(u.get("role")),
            "open_tickets": open_tickets,
            "open_tasks": open_tasks,
            "overdue_tasks": overdue_tasks,
            "total_updates": updates_count,
            "completed_items": completed_items
        })

    return report

@router.get("/summary")
def get_system_summary_report(current_user: UserRead = Depends(get_current_user)) -> Dict[str, Any]:
    tickets = repository.get_tickets()
    tasks = repository.get_tasks()

    ticket_status_dist = {}
    for t in tickets:
        ticket_status_dist[t.status] = ticket_status_dist.get(t.status, 0) + 1

    task_status_dist = {}
    for t in tasks:
        task_status_dist[t.status] = task_status_dist.get(t.status, 0) + 1

    return {
        "tickets": {
            "total": len(tickets),
            "by_status": ticket_status_dist
        },
        "tasks": {
            "total": len(tasks),
            "by_status": task_status_dist
        }
    }
