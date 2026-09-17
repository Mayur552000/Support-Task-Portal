from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.db.models import (
    UserRead, TicketRead, TicketUpdateRead, TaskRead, TaskUpdateRead,
    DocumentRead, KBArticleRead, AuditLogRead, PersonalNote
)

class BaseRepository(ABC):
    """Abstract Repository Interface for CASCO IT Portal.
    Ensures storage layer (Excel vs MySQL) is completely decoupled from business logic."""

    # --- User Management ---
    @abstractmethod
    def get_users(self) -> List[Dict[str, Any]]: pass

    @abstractmethod
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]: pass

    @abstractmethod
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]: pass

    # --- Tickets (Read & Internal Updates Only) ---
    @abstractmethod
    def get_tickets(self, agent_id: Optional[str] = None) -> List[TicketRead]: pass

    @abstractmethod
    def get_ticket_by_id(self, ticket_id: str) -> Optional[TicketRead]: pass

    @abstractmethod
    def save_tickets_batch(self, tickets: List[TicketRead]) -> None: pass

    @abstractmethod
    def add_ticket_update(self, update: TicketUpdateRead) -> None: pass

    @abstractmethod
    def get_ticket_updates(self, ticket_id: str) -> List[TicketUpdateRead]: pass

    # --- Tasks ---
    @abstractmethod
    def get_tasks(self, assignee_id: Optional[str] = None) -> List[TaskRead]: pass

    @abstractmethod
    def get_task_by_id(self, task_id: str) -> Optional[TaskRead]: pass

    @abstractmethod
    def create_task(self, task: TaskRead) -> TaskRead: pass

    @abstractmethod
    def update_task(self, task_id: str, updates_dict: Dict[str, Any]) -> Optional[TaskRead]: pass

    @abstractmethod
    def add_task_update(self, update: TaskUpdateRead) -> None: pass

    @abstractmethod
    def get_task_updates(self, task_id: str) -> List[TaskUpdateRead]: pass

    # --- Documents ---
    @abstractmethod
    def get_documents(self, category: Optional[str] = None) -> List[DocumentRead]: pass

    @abstractmethod
    def create_document(self, doc: DocumentRead) -> DocumentRead: pass

    @abstractmethod
    def delete_document(self, doc_id: str) -> bool: pass

    # --- Knowledge Base ---
    @abstractmethod
    def get_kb_articles(self, category: Optional[str] = None) -> List[KBArticleRead]: pass

    @abstractmethod
    def create_kb_article(self, article: KBArticleRead) -> KBArticleRead: pass

    # --- Personal Notes ---
    @abstractmethod
    def get_personal_notes(self, user_id: str) -> List[PersonalNote]: pass

    @abstractmethod
    def save_personal_note(self, note: PersonalNote) -> PersonalNote: pass

    @abstractmethod
    def delete_personal_note(self, note_id: str, user_id: str) -> bool: pass

    # --- Audit Log ---
    @abstractmethod
    def add_audit_log(self, user_id: str, username: str, action: str, entity: str, entity_id: str, result: str, details: str) -> None: pass

    @abstractmethod
    def get_audit_logs(self, limit: int = 100) -> List[AuditLogRead]: pass
