from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.db.models import (
    DashboardData, KPIMetrics, RecentUpdateItem, UpcomingFollowUpItem,
    UserRead, TeamDashboardData, TeamKPIMetrics, AgentKPICard, AgentDetailData, TicketRead
)
from app.api.auth import get_current_user
from app.db.excel_repository import repository
from app.services.notification_service import get_active_notifications

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

AVATAR_COLORS = [
    "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626",
    "#0891b2", "#4f46e5", "#c026d3", "#0d9488", "#ea580c"
]

def _compute_workload_status(open_cnt: int, overdue_cnt: int, crit_cnt: int) -> str:
    if overdue_cnt > 0:
        return "Overdue"
    if crit_cnt >= 3 or open_cnt >= 25:
        return "Critical"
    if open_cnt >= 15:
        return "High"
    return "Normal"

@router.get("/team", response_model=TeamDashboardData)
def get_team_dashboard(
    high_threshold: int = Query(15, description="Threshold for High workload"),
    critical_threshold: int = Query(25, description="Threshold for Critical workload"),
    current_user: UserRead = Depends(get_current_user)
):
    """
    Team-wide Dashboard summarizing all active agents, overall team KPIs, and live Helpdesk tickets.
    Derived purely from configured users and real Helpdesk data. Zero fake/dummy data.
    """
    all_tickets = repository.get_tickets()
    all_users = repository.get_user_models()
    all_tasks = repository.get_tasks()
    all_updates = repository.get_all_ticket_updates()

    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Overall Team KPIs
    open_tickets = [t for t in all_tickets if t.status not in ["Resolved", "Closed"]]
    overdue_tickets = [t for t in open_tickets if t.is_stale]
    due_today_tickets = [t for t in open_tickets if t.created_at.startswith(today_str)]
    critical_high_tickets = [t for t in open_tickets if t.priority in ["High", "Critical"]]
    unassigned_tickets = [t for t in open_tickets if not t.assigned_agent_id or t.assigned_agent_id in ["0", "None", ""]]
    active_agents = [u for u in all_users if u.is_active and u.status != "Disabled"]

    team_kpis = TeamKPIMetrics(
        total_open_tickets=len(open_tickets),
        total_overdue_tickets=len(overdue_tickets),
        tickets_due_today=len(due_today_tickets),
        critical_high_tickets=len(critical_high_tickets),
        unassigned_tickets=len(unassigned_tickets),
        total_active_agents=len(active_agents),
        total_tickets=len(all_tickets)
    )

    # 2. Agent KPI Cards
    agent_cards: List[AgentKPICard] = []
    for idx, agent in enumerate(active_agents):
        # Fetch tickets matching this agent
        agent_tickets = repository.get_tickets(agent_id=agent.user_id)
        agent_open = [t for t in agent_tickets if t.status not in ["Resolved", "Closed"]]
        agent_overdue = [t for t in agent_open if t.is_stale]
        agent_due_today = [t for t in agent_open if t.created_at.startswith(today_str)]
        agent_pending = [t for t in agent_open if t.status in ["Pending", "Hold", "Wait Customer", "Wait User"]]
        agent_crit_high = [t for t in agent_open if t.priority in ["High", "Critical"]]
        
        # Recent updates for this agent
        agent_upds_cnt = sum(1 for u in all_updates if u.agent_id == agent.user_id or u.agent_name.lower() == agent.full_name.lower())

        workload = _compute_workload_status(len(agent_open), len(agent_overdue), len(agent_crit_high))
        color = AVATAR_COLORS[idx % len(AVATAR_COLORS)]

        agent_cards.append(AgentKPICard(
            agent_id=agent.user_id,
            user_id=agent.username or agent.user_id,
            name=agent.full_name,
            email=agent.email,
            role=agent.role,
            account_status=agent.status,
            external_helpdesk_agent_id=agent.external_helpdesk_agent_id,
            total_tickets=len(agent_tickets),
            open_tickets=len(agent_open),
            overdue_tickets=len(agent_overdue),
            due_today_tickets=len(agent_due_today),
            pending_tickets=len(agent_pending),
            critical_high_tickets=len(agent_crit_high),
            recent_updates_count=agent_upds_cnt,
            workload_status=workload,
            avatar_color=color
        ))

    last_sync = all_tickets[0].last_sync_at if all_tickets else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return TeamDashboardData(
        team_kpis=team_kpis,
        agent_cards=agent_cards,
        team_tickets=all_tickets,
        last_helpdesk_sync=last_sync,
        helpdesk_status_online=True,
        workload_thresholds={
            "high_workload": high_threshold,
            "critical_workload": critical_threshold,
            "overdue_threshold": 1
        }
    )

@router.get("/agents/{agent_id}", response_model=AgentDetailData)
def get_agent_workspace_detail(agent_id: str, current_user: UserRead = Depends(get_current_user)):
    """
    Dedicated Agent Workspace data drill-down:
    Contains the agent's profile, KPI metrics, Helpdesk tickets, internal tasks, and internal updates.
    """
    user_dict = repository.get_user_by_id(agent_id)
    if not user_dict:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")

    agent = repository._dict_to_user_read(user_dict)
    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Agent's Helpdesk tickets
    agent_tickets = repository.get_tickets(agent_id=agent.user_id)
    open_tks = [t for t in agent_tickets if t.status not in ["Resolved", "Closed"]]
    overdue_tks = [t for t in open_tks if t.is_stale]
    due_today_tks = [t for t in open_tks if t.created_at.startswith(today_str)]
    pending_tks = [t for t in open_tks if t.status in ["Pending", "Hold", "Wait Customer", "Wait User"]]
    crit_high_tks = [t for t in open_tks if t.priority in ["High", "Critical"]]

    # 2. Agent's internal tasks
    agent_tasks = repository.get_tasks(assignee_id=agent.user_id)

    # 3. Agent's internal work logs / updates
    all_t_upds = repository.get_all_ticket_updates()
    all_tk_upds = repository.get_all_task_updates()

    recent_updates: List[RecentUpdateItem] = []
    for u in all_t_upds:
        if u.agent_id == agent.user_id or u.agent_name.lower() == agent.full_name.lower():
            # Find ticket title
            t_match = next((t for t in agent_tickets if t.ticket_id == u.ticket_id), None)
            title = t_match.subject if t_match else f"Ticket #{u.ticket_id}"
            recent_updates.append(RecentUpdateItem(
                type="Ticket",
                id=u.ticket_id,
                title=title,
                agent_name=u.agent_name,
                update_text=u.update_text,
                status=u.status_after or "Updated",
                timestamp=u.timestamp
            ))

    for u in all_tk_upds:
        if u.agent_id == agent.user_id or u.agent_name.lower() == agent.full_name.lower():
            tsk_match = next((tk for tk in agent_tasks if tk.task_id == u.task_id), None)
            title = tsk_match.title if tsk_match else f"Task #{u.task_id}"
            recent_updates.append(RecentUpdateItem(
                type="Task",
                id=u.task_id,
                title=title,
                agent_name=u.agent_name,
                update_text=u.update_text,
                status=u.status_after or "In Progress",
                timestamp=u.timestamp
            ))

    recent_updates.sort(key=lambda x: x.timestamp, reverse=True)

    workload = _compute_workload_status(len(open_tks), len(overdue_tks), len(crit_high_tks))

    kpis = AgentKPICard(
        agent_id=agent.user_id,
        user_id=agent.username or agent.user_id,
        name=agent.full_name,
        email=agent.email,
        role=agent.role,
        account_status=agent.status,
        external_helpdesk_agent_id=agent.external_helpdesk_agent_id,
        total_tickets=len(agent_tickets),
        open_tickets=len(open_tks),
        overdue_tickets=len(overdue_tks),
        due_today_tickets=len(due_today_tks),
        pending_tickets=len(pending_tks),
        critical_high_tickets=len(crit_high_tks),
        recent_updates_count=len(recent_updates),
        workload_status=workload,
        avatar_color="#2563eb"
    )

    last_sync = agent_tickets[0].last_sync_at if agent_tickets else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return AgentDetailData(
        agent=agent,
        kpis=kpis,
        tickets=agent_tickets,
        tasks=agent_tasks,
        updates=recent_updates,
        last_sync=last_sync
    )

@router.get("", response_model=DashboardData)
def get_dashboard_data(current_user: UserRead = Depends(get_current_user)):
    """Personal agent dashboard data fallback."""
    agent_id = current_user.user_id
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")

    tickets = repository.get_tickets(agent_id=agent_id)
    tasks = repository.get_tasks(assignee_id=agent_id)

    open_tickets = sum(1 for t in tickets if t.status not in ["Resolved", "Closed"])
    overdue_tasks = sum(1 for t in tasks if t.is_overdue)
    tasks_due_today = sum(1 for t in tasks if t.due_date == today_str and t.status not in ["Completed", "Cancelled"])
    pending_updates = sum(1 for t in tickets if t.status == "Pending") + sum(1 for t in tasks if t.status == "Pending")
    recently_completed = sum(1 for t in tickets if t.status in ["Resolved", "Closed"]) + sum(1 for t in tasks if t.status == "Completed")

    kpis = KPIMetrics(
        open_tickets=open_tickets,
        overdue_tasks=overdue_tasks,
        tasks_due_today=tasks_due_today,
        pending_updates=pending_updates,
        recently_completed=recently_completed
    )

    recent_updates = []
    for tk in tickets:
        for u in tk.updates:
            recent_updates.append(RecentUpdateItem(
                type="Ticket",
                id=tk.ticket_id,
                title=tk.subject,
                agent_name=u.agent_name,
                update_text=u.update_text,
                status=u.status_after or tk.status,
                timestamp=u.timestamp
            ))

    for tsk in tasks:
        for u in tsk.updates:
            recent_updates.append(RecentUpdateItem(
                type="Task",
                id=tsk.task_id,
                title=tsk.title,
                agent_name=u.agent_name,
                update_text=u.update_text,
                status=u.status_after or tsk.status,
                timestamp=u.timestamp
            ))

    recent_updates.sort(key=lambda x: x.timestamp, reverse=True)
    recent_updates = recent_updates[:10]

    upcoming = []
    for tk in tickets:
        for u in tk.updates:
            if u.follow_up_date:
                upcoming.append(UpcomingFollowUpItem(
                    work_item=f"{tk.ticket_id}: {tk.subject}",
                    work_type="Ticket",
                    item_id=tk.ticket_id,
                    due_followup_date=u.follow_up_date,
                    priority=tk.priority,
                    status=tk.status,
                    next_action=u.next_action or "Follow up on ticket"
                ))

    for tsk in tasks:
        if tsk.status not in ["Completed", "Cancelled"]:
            upcoming.append(UpcomingFollowUpItem(
                work_item=f"{tsk.task_id}: {tsk.title}",
                work_type="Task",
                item_id=tsk.task_id,
                due_followup_date=tsk.due_date,
                priority=tsk.priority,
                status=tsk.status,
                next_action="Complete task deliverables"
            ))

    upcoming.sort(key=lambda x: x.due_followup_date)
    last_sync = tickets[0].last_sync_at if tickets else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return DashboardData(
        kpis=kpis,
        current_tickets=tickets,
        current_tasks=tasks,
        recent_updates=recent_updates,
        upcoming_followups=upcoming[:10],
        last_helpdesk_sync=last_sync,
        helpdesk_status_online=True
    )

@router.get("/notifications")
def get_notifications(current_user: UserRead = Depends(get_current_user)):
    return get_active_notifications(current_user.user_id)
