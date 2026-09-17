import os
import shutil
import threading
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
import openpyxl
from openpyxl import Workbook

from app.core.config import settings
from app.core.security import hash_password
from app.db.base_repository import BaseRepository
from app.db.models import (
    UserRead, TicketRead, TicketUpdateRead, TaskRead, TaskUpdateRead,
    DocumentRead, KBArticleRead, AuditLogRead, PersonalNote, TicketActivity
)

class ExcelRepository(BaseRepository):
    """Production Excel persistence engine with thread-locking (RLock), auto-backup, and seed data."""
    
    _lock = threading.RLock()

    def __init__(self, file_path: str = settings.EXCEL_FILE_PATH):
        self.file_path = file_path
        self._ensure_workbook_exists()

    def _ensure_workbook_exists(self):
        with self._lock:
            if not os.path.exists(self.file_path):
                wb = Workbook()
                # Remove default sheet
                wb.remove(wb.active)

                # Define required sheets and headers
                sheets_def = {
                    "Users": ["user_id", "username", "password_hash", "full_name", "email", "role", "external_helpdesk_agent_id", "is_active", "status", "source", "created_at"],
                    "Tickets": ["ticket_id", "external_id", "subject", "description", "priority", "status", "assigned_agent_id", "assigned_agent_name", "created_at", "updated_at", "last_sync_at", "tags", "is_stale", "status_durations_json", "activities_json"],
                    "Ticket_Updates": ["update_id", "ticket_id", "agent_id", "agent_name", "update_text", "status_after", "timestamp", "next_action", "follow_up_date"],
                    "Tasks": ["task_id", "title", "description", "project", "category", "priority", "status", "assignee_id", "assignee_name", "start_date", "due_date", "completion_pct", "created_at", "updated_at", "related_ticket_id"],
                    "Task_Updates": ["update_id", "task_id", "agent_id", "agent_name", "update_text", "status_after", "completion_pct_after", "timestamp"],
                    "Documents": ["doc_id", "title", "category", "description", "version", "uploaded_by_id", "uploaded_by_name", "uploaded_date", "modified_date", "file_path", "tags", "related_item_id"],
                    "Knowledge_Base": ["article_id", "title", "category", "problem_summary", "validation_checks", "solution_steps", "related_doc_ids", "related_ticket_ids", "created_at", "updated_at"],
                    "Audit_Log": ["audit_id", "user_id", "username", "action", "entity", "entity_id", "timestamp", "result", "details"],
                    "Personal_Notes": ["note_id", "user_id", "title", "content", "updated_at"]
                }

                for sheet_name, headers in sheets_def.items():
                    ws = wb.create_sheet(title=sheet_name)
                    ws.append(headers)

                wb.save(self.file_path)
                self._seed_default_data()
                self.create_backup()

    def create_backup(self):
        """Generates timestamped backup copy in data/backup directory."""
        with self._lock:
            if os.path.exists(self.file_path):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"support_data_{timestamp}.xlsx"
                backup_path = os.path.join(settings.BACKUP_DATA_DIR, backup_name)
                shutil.copy2(self.file_path, backup_path)

    def _seed_default_data(self):
        """Seed initial users, technical docs, and knowledge base. Zero fake tickets."""
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)

            # Seed Users (Configured support team members)
            users_ws = wb["Users"]
            default_users = [
                ["USR-101", "admin", hash_password("password123"), "System Admin", "admin@casco.com", "ADMIN", "0", True, "Active", "Local", "2026-01-10 09:00:00"],
                ["USR-102", "mayur", hash_password("password123"), "Mayur R", "mayur.r@digitusbiz.com", "ADMIN", "12056973780", True, "Active", "Helpdesk", "2026-01-10 09:00:00"],
                ["USR-103", "nithin", hash_password("password123"), "Nithin Nanjappa", "nithin.nanjappa@cascoauto.com", "ADMIN", "12055605196", True, "Active", "Helpdesk", "2026-02-01 09:00:00"]
            ]
            for u in default_users:
                users_ws.append(u)

            # No fake tickets or dummy updates seeded - Helpdesk sync populates real tickets
            # Tasks sheet starts empty or with genuine assigned items
            # Seed Documents
            docs_ws = wb["Documents"]
            default_docs = [
                ["DOC-501", "SMTP Server Integration & Troubleshooting Guide", "Troubleshooting", "Step-by-step resolution for Bottomline SMTP connection timeouts and relay rules.", "2.1", "USR-102", "Sarah Connor", "2026-08-15 10:00:00", "2026-08-15 10:00:00", "/uploads/smtp_guide.pdf", "SMTP,Bottomline,Mail", "44690"],
                ["DOC-502", "QAD Progress 4GL Interface Architecture Specification", "Interfaces", "Technical overview of QAD Progress 4GL database sockets and EDI translators.", "1.4", "USR-102", "Sarah Connor", "2026-07-20 14:00:00", "2026-07-20 14:00:00", "/uploads/qad_interface.pdf", "QAD,Progress 4GL,EDI", "44690"]
            ]
            for d in default_docs:
                docs_ws.append(d)

            # Seed Knowledge Base
            kb_ws = wb["Knowledge_Base"]
            default_kb = [
                [
                    "KB-201",
                    "SMTP Connection & Email Delivery Troubleshooting",
                    "Troubleshooting",
                    "Emails fail to send from Bottomline or QAD system with connection timeout error.",
                    json.dumps([
                        "1. Verify port 25/587 ping from application server.",
                        "2. Check Bottomline Windows Service status.",
                        "3. Inspect firewall outgoing logs.",
                        "4. Validate relay IP whitelisting on Exchange/Office365."
                    ]),
                    json.dumps([
                        "Step 1: Open PowerShell on app server and test `Test-NetConnection -ComputerName smtp.casco.com -Port 25`.",
                        "Step 2: Restart 'Bottomline Output Server' service if socket hangs.",
                        "Step 3: If firewall drops packets, submit emergency ticket to Network Operations."
                    ]),
                    json.dumps(["DOC-501"]),
                    json.dumps(["INC-10234"]),
                    "2026-08-20 10:00:00",
                    "2026-08-20 10:00:00"
                ]
            ]
            for kb_art in default_kb:
                kb_ws.append(kb_art)

            # Seed Audit Log
            audit_ws = wb["Audit_Log"]
            audit_ws.append(["AUD-001", "USR-101", "mayur", "SYSTEM_INIT", "System", "SYS", "2026-09-09 10:00:00", "SUCCESS", "Initial seed data loaded into Excel repository."])

            wb.save(self.file_path)

    # --- Helper methods ---
    def _read_rows(self, sheet_name: str) -> List[Dict[str, Any]]:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path, data_only=True)
            if sheet_name not in wb.sheetnames:
                return []
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))
            if not rows or len(rows) < 2:
                return []
            headers = [str(h).strip() if h is not None else "" for h in rows[0]]
            data = []
            for r in rows[1:]:
                row_dict = {}
                for idx, val in enumerate(r):
                    if idx < len(headers):
                        row_dict[headers[idx]] = val
                data.append(row_dict)
            return data

    def _append_row(self, sheet_name: str, values: List[Any]):
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb[sheet_name]
            ws.append(values)
            wb.save(self.file_path)

    # --- User Management Implementation ---
    def _dict_to_user_read(self, u: Dict[str, Any]) -> UserRead:
        status = str(u.get("status", "Active"))
        is_active = bool(u.get("is_active", True)) and status != "Disabled"
        return UserRead(
            user_id=str(u.get("user_id", "")),
            username=str(u.get("username", "")),
            full_name=str(u.get("full_name", "")),
            email=str(u.get("email", "")),
            role=str(u.get("role", "AGENT")),
            external_helpdesk_agent_id=str(u.get("external_helpdesk_agent_id", "0")),
            is_active=is_active,
            status=status,
            source=str(u.get("source", "Local")),
            created_at=str(u.get("created_at", ""))
        )

    def get_users(self) -> List[Dict[str, Any]]:
        return self._read_rows("Users")

    def get_user_models(self) -> List[UserRead]:
        return [self._dict_to_user_read(u) for u in self.get_users()]

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        users = self.get_users()
        for u in users:
            if str(u.get("username", "")).lower() == username.lower() or str(u.get("user_id", "")).lower() == username.lower():
                return u
        return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        users = self.get_users()
        for u in users:
            if str(u.get("user_id", "")).lower() == str(user_id).lower() or str(u.get("username", "")).lower() == str(user_id).lower() or str(u.get("external_helpdesk_agent_id", "")) == str(user_id):
                return u
        return None

    def create_user(self, user_data: Dict[str, Any]) -> UserRead:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Users"]
            headers = [str(cell.value).strip() if cell.value else "" for cell in ws[1]]
            
            uid = user_data.get("user_id")
            if not uid:
                max_id = 100
                for row in ws.iter_rows(min_row=2, values_only=True):
                    val = str(row[0]) if row[0] else ""
                    if val.startswith("USR-"):
                        try:
                            max_id = max(max_id, int(val.replace("USR-", "")))
                        except ValueError:
                            pass
                uid = f"USR-{max_id + 1}"

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            row_vals = [
                uid,
                user_data.get("username", ""),
                user_data.get("password_hash", ""),
                user_data.get("full_name", ""),
                user_data.get("email", ""),
                user_data.get("role", "AGENT"),
                str(user_data.get("external_helpdesk_agent_id", "0")),
                user_data.get("is_active", True),
                user_data.get("status", "Active"),
                user_data.get("source", "Local"),
                user_data.get("created_at", now_str)
            ]
            ws.append(row_vals)
            wb.save(self.file_path)

        return UserRead(
            user_id=uid,
            username=user_data.get("username", ""),
            full_name=user_data.get("full_name", ""),
            email=user_data.get("email", ""),
            role=user_data.get("role", "AGENT"),
            external_helpdesk_agent_id=str(user_data.get("external_helpdesk_agent_id", "0")),
            is_active=bool(user_data.get("is_active", True)),
            status=user_data.get("status", "Active"),
            source=user_data.get("source", "Local"),
            created_at=now_str
        )

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[UserRead]:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Users"]
            headers = [str(cell.value).strip() if cell.value else "" for cell in ws[1]]

            target_row_idx = None
            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
                if str(row[0].value) == user_id or str(row[1].value) == user_id:
                    target_row_idx = row_idx
                    break

            if not target_row_idx:
                return None

            for k, v in updates.items():
                if k in headers and v is not None:
                    col_idx = headers.index(k) + 1
                    ws.cell(row=target_row_idx, column=col_idx, value=v)
            wb.save(self.file_path)

        u_dict = self.get_user_by_id(user_id)
        if u_dict:
            return self._dict_to_user_read(u_dict)
        return None

    def delete_user(self, user_id: str) -> bool:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Users"]
            target_row_idx = None
            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
                if str(row[0].value) == user_id or str(row[1].value) == user_id:
                    target_row_idx = row_idx
                    break
            if target_row_idx:
                ws.delete_rows(target_row_idx)
                wb.save(self.file_path)
                return True
            return False

    def reset_password(self, user_id: str, new_hash: str) -> bool:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Users"]
            headers = [str(cell.value).strip() if cell.value else "" for cell in ws[1]]
            pwd_col = headers.index("password_hash") + 1 if "password_hash" in headers else 3
            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
                if str(row[0].value) == user_id or str(row[1].value) == user_id:
                    ws.cell(row=row_idx, column=pwd_col, value=new_hash)
                    wb.save(self.file_path)
                    return True
            return False

    def toggle_user_status(self, user_id: str, status: str) -> bool:
        is_active = status != "Disabled"
        res = self.update_user(user_id, {"status": status, "is_active": is_active})
        return res is not None

    # --- Tickets Implementation ---
    def get_tickets(self, agent_id: Optional[str] = None) -> List[TicketRead]:
        rows = self._read_rows("Tickets")
        updates_all = self._read_all_ticket_updates()

        user_match_keys = set()
        if agent_id:
            aid_clean = str(agent_id).strip().lower()
            user_match_keys.add(aid_clean)
            user = self.get_user_by_id(agent_id)
            if user:
                user_match_keys.add(str(user.get("user_id", "")).strip().lower())
                user_match_keys.add(str(user.get("username", "")).strip().lower())
                user_match_keys.add(str(user.get("full_name", "")).strip().lower())
                ext_id = str(user.get("external_helpdesk_agent_id", "")).strip().lower()
                if ext_id and ext_id != "0" and ext_id != "none":
                    user_match_keys.add(ext_id)
                    user_match_keys.add(f"agent id: {ext_id}")
                    user_match_keys.add(f"freshdesk agent #{ext_id}")
                    user_match_keys.add(f"agent #{ext_id}")

        tickets = []
        for r in rows:
            t_id = str(r.get("ticket_id", ""))
            a_id = str(r.get("assigned_agent_id", "")).strip().lower()
            a_name = str(r.get("assigned_agent_name", "")).strip().lower()

            if agent_id:
                matched = (
                    a_id in user_match_keys or
                    a_name in user_match_keys or
                    any(k in a_name for k in user_match_keys if len(k) > 3) or
                    any(k in a_id for k in user_match_keys if len(k) > 3)
                )
                if not matched:
                    continue


            tags_raw = str(r.get("tags", "") or "")
            tags_list = [t.strip() for t in tags_raw.split(",") if t.strip()]

            t_updates = [u for u in updates_all if u.ticket_id == t_id]

            durations_raw = str(r.get("status_durations_json", "") or "")
            activities_raw = str(r.get("activities_json", "") or "")
            try:
                status_durations = json.loads(durations_raw) if durations_raw and durations_raw != "None" else {}
            except Exception:
                status_durations = {}

            try:
                activities_list = [TicketActivity(**a) for a in json.loads(activities_raw)] if activities_raw and activities_raw != "None" else []
            except Exception:
                activities_list = []

            tickets.append(TicketRead(
                ticket_id=t_id,
                external_id=str(r.get("external_id", t_id)),
                subject=str(r.get("subject", "")),
                description=str(r.get("description", "")),
                priority=str(r.get("priority", "Medium")),
                status=str(r.get("status", "Open")),
                assigned_agent_id=a_id,
                assigned_agent_name=str(r.get("assigned_agent_name", "")),
                created_at=str(r.get("created_at", "")),
                updated_at=str(r.get("updated_at", "")),
                last_sync_at=str(r.get("last_sync_at", "")),
                tags=tags_list,
                is_stale=bool(r.get("is_stale", False)),
                status_durations=status_durations,
                activities=activities_list,
                updates=t_updates
            ))
        return tickets

    def get_ticket_by_id(self, ticket_id: str) -> Optional[TicketRead]:
        tickets = self.get_tickets()
        for t in tickets:
            if t.ticket_id == ticket_id or t.external_id == ticket_id:
                return t
        return None

    def save_tickets_batch(self, tickets: List[TicketRead]) -> None:
        """Batch update tickets from Helpdesk sync cache."""
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Tickets"]
            headers = [cell.value for cell in ws[1]]

            # Ensure columns exist in header
            if "status_durations_json" not in headers:
                ws.cell(row=1, column=len(headers) + 1, value="status_durations_json")
                headers.append("status_durations_json")
            if "activities_json" not in headers:
                ws.cell(row=1, column=len(headers) + 1, value="activities_json")
                headers.append("activities_json")

            existing_map = {}
            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                t_id = str(row[0]) if row[0] else ""
                if t_id:
                    existing_map[t_id] = row_idx

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            for t in tickets:
                tags_str = ",".join(t.tags)
                durations_json = json.dumps(t.status_durations or {})
                activities_json = json.dumps([a.model_dump() for a in t.activities] if t.activities else [])
                row_vals = [
                    t.ticket_id, t.external_id, t.subject, t.description,
                    t.priority, t.status, t.assigned_agent_id, t.assigned_agent_name,
                    t.created_at, now_str, t.last_sync_at, tags_str, t.is_stale,
                    durations_json, activities_json
                ]
                if t.ticket_id in existing_map:
                    row_num = existing_map[t.ticket_id]
                    for col_idx, val in enumerate(row_vals, start=1):
                        ws.cell(row=row_num, column=col_idx, value=val)
                else:
                    ws.append(row_vals)
            wb.save(self.file_path)

    def add_ticket_update(self, update: TicketUpdateRead) -> None:
        row_vals = [
            update.update_id, update.ticket_id, update.agent_id, update.agent_name,
            update.update_text, update.status_after or "", update.timestamp,
            update.next_action or "", update.follow_up_date or ""
        ]
        self._append_row("Ticket_Updates", row_vals)

        # Update Ticket status and updated_at timestamp in Tickets sheet
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Tickets"]
            for row in ws.iter_rows(min_row=2):
                if str(row[0].value) == update.ticket_id:
                    if update.status_after:
                        row[5].value = update.status_after  # Status column
                    row[9].value = update.timestamp         # Updated_at column
                    row[12].value = False                   # is_stale reset
                    break
            wb.save(self.file_path)

    def get_all_ticket_updates(self) -> List[TicketUpdateRead]:
        return self._read_all_ticket_updates()

    def get_ticket_updates(self, ticket_id: str) -> List[TicketUpdateRead]:
        all_upds = self._read_all_ticket_updates()
        return [u for u in all_upds if u.ticket_id == ticket_id]

    def _read_all_ticket_updates(self) -> List[TicketUpdateRead]:
        rows = self._read_rows("Ticket_Updates")
        updates = []
        for r in rows:
            updates.append(TicketUpdateRead(
                update_id=str(r.get("update_id", "")),
                ticket_id=str(r.get("ticket_id", "")),
                agent_id=str(r.get("agent_id", "")),
                agent_name=str(r.get("agent_name", "")),
                update_text=str(r.get("update_text", "")),
                status_after=str(r.get("status_after", "")) if r.get("status_after") else None,
                timestamp=str(r.get("timestamp", "")),
                next_action=str(r.get("next_action", "")) if r.get("next_action") else None,
                follow_up_date=str(r.get("follow_up_date", "")) if r.get("follow_up_date") else None
            ))
        return updates

    def get_ticket_updates(self, ticket_id: str) -> List[TicketUpdateRead]:
        all_u = self._read_all_ticket_updates()
        return [u for u in all_u if u.ticket_id == ticket_id]

    # --- Tasks Implementation ---
    def get_tasks(self, assignee_id: Optional[str] = None) -> List[TaskRead]:
        rows = self._read_rows("Tasks")
        updates_all = self._read_all_task_updates()
        today_str = datetime.now().strftime("%Y-%m-%d")

        tasks = []
        for r in rows:
            tk_id = str(r.get("task_id", ""))
            a_id = str(r.get("assignee_id", ""))
            if assignee_id and a_id != assignee_id:
                continue

            due_date = str(r.get("due_date", ""))
            status = str(r.get("status", "Open"))
            is_overdue = (due_date < today_str) and (status not in ["Completed", "Cancelled"])

            tk_updates = [u for u in updates_all if u.task_id == tk_id]

            tasks.append(TaskRead(
                task_id=tk_id,
                title=str(r.get("title", "")),
                description=str(r.get("description", "")),
                project=str(r.get("project", "General")),
                category=str(r.get("category", "General")),
                priority=str(r.get("priority", "Medium")),
                status=status,
                assignee_id=a_id,
                assignee_name=str(r.get("assignee_name", "")),
                start_date=str(r.get("start_date", "")),
                due_date=due_date,
                completion_pct=int(r.get("completion_pct", 0) or 0),
                created_at=str(r.get("created_at", "")),
                updated_at=str(r.get("updated_at", "")),
                related_ticket_id=str(r.get("related_ticket_id", "")) if r.get("related_ticket_id") else None,
                is_overdue=is_overdue,
                updates=tk_updates
            ))
        return tasks

    def get_task_by_id(self, task_id: str) -> Optional[TaskRead]:
        tasks = self.get_tasks()
        for t in tasks:
            if t.task_id == task_id:
                return t
        return None

    def create_task(self, task: TaskRead) -> TaskRead:
        row_vals = [
            task.task_id, task.title, task.description, task.project,
            task.category, task.priority, task.status, task.assignee_id,
            task.assignee_name, task.start_date, task.due_date,
            task.completion_pct, task.created_at, task.updated_at,
            task.related_ticket_id or ""
        ]
        self._append_row("Tasks", row_vals)
        return task

    def update_task(self, task_id: str, updates_dict: Dict[str, Any]) -> Optional[TaskRead]:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Tasks"]
            found = False
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            for row in ws.iter_rows(min_row=2):
                if str(row[0].value) == task_id:
                    found = True
                    if "status" in updates_dict: row[6].value = updates_dict["status"]
                    if "completion_pct" in updates_dict: row[11].value = updates_dict["completion_pct"]
                    if "due_date" in updates_dict: row[10].value = updates_dict["due_date"]
                    row[13].value = now_str  # updated_at
                    break
            if found:
                wb.save(self.file_path)
                return self.get_task_by_id(task_id)
            return None

    def add_task_update(self, update: TaskUpdateRead) -> None:
        row_vals = [
            update.update_id, update.task_id, update.agent_id, update.agent_name,
            update.update_text, update.status_after or "", update.completion_pct_after or 0,
            update.timestamp
        ]
        self._append_row("Task_Updates", row_vals)

        # Update parent task status & completion %
        updates_dict = {}
        if update.status_after: updates_dict["status"] = update.status_after
        if update.completion_pct_after is not None: updates_dict["completion_pct"] = update.completion_pct_after
        self.update_task(update.task_id, updates_dict)

    def _read_all_task_updates(self) -> List[TaskUpdateRead]:
        rows = self._read_rows("Task_Updates")
        updates = []
        for r in rows:
            updates.append(TaskUpdateRead(
                update_id=str(r.get("update_id", "")),
                task_id=str(r.get("task_id", "")),
                agent_id=str(r.get("agent_id", "")),
                agent_name=str(r.get("agent_name", "")),
                update_text=str(r.get("update_text", "")),
                status_after=str(r.get("status_after", "")) if r.get("status_after") else None,
                completion_pct_after=int(r.get("completion_pct_after", 0)) if r.get("completion_pct_after") is not None else None,
                timestamp=str(r.get("timestamp", ""))
            ))
        return updates

    def get_all_task_updates(self) -> List[TaskUpdateRead]:
        return self._read_all_task_updates()

    def get_task_updates(self, task_id: str) -> List[TaskUpdateRead]:
        all_u = self._read_all_task_updates()
        return [u for u in all_u if u.task_id == task_id]

    # --- Documents Implementation ---
    def get_documents(self, category: Optional[str] = None) -> List[DocumentRead]:
        rows = self._read_rows("Documents")
        docs = []
        for r in rows:
            cat = str(r.get("category", ""))
            if category and cat.lower() != category.lower():
                continue

            tags_raw = str(r.get("tags", "") or "")
            tags_list = [t.strip() for t in tags_raw.split(",") if t.strip()]

            docs.append(DocumentRead(
                doc_id=str(r.get("doc_id", "")),
                title=str(r.get("title", "")),
                category=cat,
                description=str(r.get("description", "")),
                version=str(r.get("version", "1.0")),
                uploaded_by_id=str(r.get("uploaded_by_id", "")),
                uploaded_by_name=str(r.get("uploaded_by_name", "")),
                uploaded_date=str(r.get("uploaded_date", "")),
                modified_date=str(r.get("modified_date", "")),
                file_path=str(r.get("file_path", "")) if r.get("file_path") else None,
                tags=tags_list,
                related_item_id=str(r.get("related_item_id", "")) if r.get("related_item_id") else None
            ))
        return docs

    def create_document(self, doc: DocumentRead) -> DocumentRead:
        tags_str = ",".join(doc.tags)
        row_vals = [
            doc.doc_id, doc.title, doc.category, doc.description, doc.version,
            doc.uploaded_by_id, doc.uploaded_by_name, doc.uploaded_date,
            doc.modified_date, doc.file_path or "", tags_str, doc.related_item_id or ""
        ]
        self._append_row("Documents", row_vals)
        return doc

    def delete_document(self, doc_id: str) -> bool:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Documents"]
            row_to_delete = None
            for idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
                if str(row[0].value) == doc_id:
                    row_to_delete = idx
                    break
            if row_to_delete:
                ws.delete_rows(row_to_delete)
                wb.save(self.file_path)
                return True
            return False

    # --- Knowledge Base Implementation ---
    def get_kb_articles(self, category: Optional[str] = None) -> List[KBArticleRead]:
        rows = self._read_rows("Knowledge_Base")
        articles = []
        for r in rows:
            cat = str(r.get("category", ""))
            if category and cat.lower() != category.lower():
                continue

            def parse_json(val):
                if not val: return []
                try: return json.loads(val)
                except: return [val]

            articles.append(KBArticleRead(
                article_id=str(r.get("article_id", "")),
                title=str(r.get("title", "")),
                category=cat,
                problem_summary=str(r.get("problem_summary", "")),
                validation_checks=parse_json(r.get("validation_checks")),
                solution_steps=parse_json(r.get("solution_steps")),
                related_doc_ids=parse_json(r.get("related_doc_ids")),
                related_ticket_ids=parse_json(r.get("related_ticket_ids")),
                created_at=str(r.get("created_at", "")),
                updated_at=str(r.get("updated_at", ""))
            ))
        return articles

    def create_kb_article(self, article: KBArticleRead) -> KBArticleRead:
        row_vals = [
            article.article_id, article.title, article.category, article.problem_summary,
            json.dumps(article.validation_checks), json.dumps(article.solution_steps),
            json.dumps(article.related_doc_ids), json.dumps(article.related_ticket_ids),
            article.created_at, article.updated_at
        ]
        self._append_row("Knowledge_Base", row_vals)
        return article

    # --- Personal Notes ---
    def get_personal_notes(self, user_id: str) -> List[PersonalNote]:
        rows = self._read_rows("Personal_Notes")
        notes = []
        for r in rows:
            if str(r.get("user_id", "")) == user_id:
                notes.append(PersonalNote(
                    note_id=str(r.get("note_id", "")),
                    user_id=user_id,
                    title=str(r.get("title", "")),
                    content=str(r.get("content", "")),
                    updated_at=str(r.get("updated_at", ""))
                ))
        return notes

    def save_personal_note(self, note: PersonalNote) -> PersonalNote:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Personal_Notes"]
            found = False
            for row in ws.iter_rows(min_row=2):
                if str(row[0].value) == note.note_id:
                    row[2].value = note.title
                    row[3].value = note.content
                    row[4].value = note.updated_at
                    found = True
                    break
            if not found:
                ws.append([note.note_id, note.user_id, note.title, note.content, note.updated_at])
            wb.save(self.file_path)
            return note

    def delete_personal_note(self, note_id: str, user_id: str) -> bool:
        with self._lock:
            wb = openpyxl.load_workbook(self.file_path)
            ws = wb["Personal_Notes"]
            row_del = None
            for idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
                if str(row[0].value) == note_id and str(row[1].value) == user_id:
                    row_del = idx
                    break
            if row_del:
                ws.delete_rows(row_del)
                wb.save(self.file_path)
                return True
            return False

    # --- Audit Log Implementation ---
    def add_audit_log(self, user_id: str, username: str, action: str, entity: str, entity_id: str, result: str, details: str) -> None:
        audit_id = f"AUD-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:17]}"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._append_row("Audit_Log", [audit_id, user_id, username, action, entity, entity_id, timestamp, result, details])

    def get_audit_logs(self, limit: int = 100) -> List[AuditLogRead]:
        rows = self._read_rows("Audit_Log")
        logs = []
        for r in reversed(rows[-limit:]):
            logs.append(AuditLogRead(
                audit_id=str(r.get("audit_id", "")),
                user_id=str(r.get("user_id", "")),
                username=str(r.get("username", "")),
                action=str(r.get("action", "")),
                entity=str(r.get("entity", "")),
                entity_id=str(r.get("entity_id", "")),
                timestamp=str(r.get("timestamp", "")),
                result=str(r.get("result", "")),
                details=str(r.get("details", ""))
            ))
        return logs

# Instantiate default excel repository singleton
repository = ExcelRepository()
