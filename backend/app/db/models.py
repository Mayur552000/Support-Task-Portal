from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserRead"

class LoginRequest(BaseModel):
    username: str
    password: str

class UserRead(BaseModel):
    user_id: str
    username: str
    full_name: str
    email: str
    role: str  # ADMIN, LEAD, AGENT
    external_helpdesk_agent_id: str
    is_active: bool = True
    status: str = "Active"  # Active, Disabled, Inactive
    source: str = "Local"   # Helpdesk, Directory, Local
    created_at: str = ""

class UserCreate(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None
    password: str
    full_name: str
    email: str
    role: str = "AGENT"
    external_helpdesk_agent_id: Optional[Any] = "0"
    source: str = "Local"  # Helpdesk, Directory, Local
    status: str = "Active"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    external_helpdesk_agent_id: Optional[Any] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class PasswordResetRequest(BaseModel):
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# --- Ticket & Ticket Update Schemas ---
class TicketActivity(BaseModel):
    activity_id: str
    actor: str
    action_text: str
    timestamp: str
    category: str = "System"  # System, Agent, Customer, Automation, Note, Reply

class TicketUpdateCreate(BaseModel):
    update_text: str
    status: Optional[str] = None
    next_action: Optional[str] = None
    follow_up_date: Optional[str] = None

class TicketUpdateRead(BaseModel):
    update_id: str
    ticket_id: str
    agent_id: str
    agent_name: str
    update_text: str
    status_after: Optional[str] = None
    timestamp: str
    next_action: Optional[str] = None
    follow_up_date: Optional[str] = None

class TicketRead(BaseModel):
    ticket_id: str
    external_id: str
    subject: str
    description: str
    priority: str  # Low, Medium, High, Critical
    status: str    # Open, In Progress, Pending, Blocked, Resolved, Closed
    assigned_agent_id: str
    assigned_agent_name: str
    created_at: str
    updated_at: str
    last_sync_at: str
    tags: List[str] = []
    is_stale: bool = False
    status_durations: Dict[str, float] = {}  # Status -> Duration in Days (e.g. {"Open": 0.58, "In Progress": 1.1})
    activities: List[TicketActivity] = []
    updates: List[TicketUpdateRead] = []

# --- Task & Task Update Schemas ---
class TaskCreate(BaseModel):
    title: str
    description: str
    project: str = "General Support"
    category: str = "Troubleshooting"
    priority: str = "Medium"  # Low, Medium, High, Critical
    status: str = "Open"      # Open, In Progress, Pending, Blocked, Completed, Cancelled
    assignee_id: str
    assignee_name: str
    start_date: str
    due_date: str
    completion_pct: int = 0
    related_ticket_id: Optional[str] = None

class TaskUpdateCreate(BaseModel):
    update_text: str
    status: Optional[str] = None
    completion_pct: Optional[int] = None
    next_action: Optional[str] = None
    follow_up_date: Optional[str] = None

class TaskUpdateRead(BaseModel):
    update_id: str
    task_id: str
    agent_id: str
    agent_name: str
    update_text: str
    status_after: Optional[str] = None
    completion_pct_after: Optional[int] = None
    timestamp: str

class TaskRead(BaseModel):
    task_id: str
    title: str
    description: str
    project: str
    category: str
    priority: str
    status: str
    assignee_id: str
    assignee_name: str
    start_date: str
    due_date: str
    completion_pct: int
    created_at: str
    updated_at: str
    related_ticket_id: Optional[str] = None
    is_overdue: bool = False
    updates: List[TaskUpdateRead] = []

# --- Document Schemas ---
class DocumentCreate(BaseModel):
    title: str
    category: str  # QAD, Progress 4GL, EDI, NiceLabel, Bottomline, SQL, Interfaces, Business Processes, Troubleshooting, Support Procedures
    description: str
    version: str = "1.0"
    tags: List[str] = []
    related_item_id: Optional[str] = None

class DocumentRead(BaseModel):
    doc_id: str
    title: str
    category: str
    description: str
    version: str
    uploaded_by_id: str
    uploaded_by_name: str
    uploaded_date: str
    modified_date: str
    file_path: Optional[str] = None
    tags: List[str] = []
    related_item_id: Optional[str] = None

# --- Knowledge Base Schemas ---
class KBArticleCreate(BaseModel):
    title: str
    category: str
    problem_summary: str
    validation_checks: List[str] = []
    solution_steps: List[str] = []
    related_doc_ids: List[str] = []
    related_ticket_ids: List[str] = []

class KBArticleRead(BaseModel):
    article_id: str
    title: str
    category: str
    problem_summary: str
    validation_checks: List[str] = []
    solution_steps: List[str] = []
    related_doc_ids: List[str] = []
    related_ticket_ids: List[str] = []
    created_at: str
    updated_at: str

# --- Personal Notes Schemas ---
class PersonalNote(BaseModel):
    note_id: str
    user_id: str
    title: str
    content: str
    updated_at: str

# --- Audit Log Schema ---
class AuditLogRead(BaseModel):
    audit_id: str
    user_id: str
    username: str
    action: str
    entity: str
    entity_id: str
    timestamp: str
    result: str
    details: str

# --- Dashboard & Reports Schemas ---
class KPIMetrics(BaseModel):
    open_tickets: int
    overdue_tasks: int
    tasks_due_today: int
    pending_updates: int
    recently_completed: int

class RecentUpdateItem(BaseModel):
    type: str  # Ticket / Task
    id: str
    title: str
    agent_name: str
    update_text: str
    status: str
    timestamp: str

class UpcomingFollowUpItem(BaseModel):
    work_item: str
    work_type: str  # Ticket / Task
    item_id: str
    due_followup_date: str
    priority: str
    status: str
    next_action: str

class DashboardData(BaseModel):
    kpis: KPIMetrics
    current_tickets: List[TicketRead]
    current_tasks: List[TaskRead]
    recent_updates: List[RecentUpdateItem]
    upcoming_followups: List[UpcomingFollowUpItem]
    last_helpdesk_sync: str
    helpdesk_status_online: bool

# --- Team Dashboard & Agent Workspaces Models ---
class AgentKPICard(BaseModel):
    agent_id: str
    user_id: str
    name: str
    email: str
    role: str
    account_status: str
    external_helpdesk_agent_id: str
    total_tickets: int
    open_tickets: int
    overdue_tickets: int
    due_today_tickets: int
    pending_tickets: int
    critical_high_tickets: int
    recent_updates_count: int
    workload_status: str  # Normal, High, Overdue, Critical
    avatar_color: str = "#2563eb"

class TeamKPIMetrics(BaseModel):
    total_open_tickets: int
    total_overdue_tickets: int
    tickets_due_today: int
    critical_high_tickets: int
    unassigned_tickets: int
    total_active_agents: int
    total_tickets: int

class TeamDashboardData(BaseModel):
    team_kpis: TeamKPIMetrics
    agent_cards: List[AgentKPICard]
    team_tickets: List[TicketRead]
    last_helpdesk_sync: str
    helpdesk_status_online: bool
    workload_thresholds: Dict[str, int] = {
        "high_workload": 15,
        "critical_workload": 25,
        "overdue_threshold": 1
    }

class AgentDetailData(BaseModel):
    agent: UserRead
    kpis: AgentKPICard
    tickets: List[TicketRead]
    tasks: List[TaskRead]
    updates: List[RecentUpdateItem]
    last_sync: str
