from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.db.models import UserRead
from app.api.auth import get_current_user
from app.services.helpdesk_service import helpdesk_client
from app.db.excel_repository import repository

router = APIRouter(prefix="/api/helpdesk", tags=["Helpdesk Read-Only Integration"])

@router.get("/tickets")
def get_helpdesk_tickets(current_user: UserRead = Depends(get_current_user)):
    """Read-only view of Freshdesk tickets assigned to the authenticated agent."""
    tickets, is_online, last_sync = helpdesk_client.fetch_tickets_for_agent(
        external_agent_id=current_user.external_helpdesk_agent_id,
        local_agent_id=current_user.user_id,
        agent_name=current_user.full_name
    )
    return {
        "tickets": tickets,
        "is_online": is_online,
        "last_sync": last_sync,
        "helpdesk_url": "https://cascoauto.freshdesk.com"
    }

@router.get("/tickets/{external_ticket_id}")
def get_helpdesk_ticket_detail(external_ticket_id: str, current_user: UserRead = Depends(get_current_user)):
    """Read-only view of a single Freshdesk ticket with full activity timeline and status durations."""
    ticket, is_online = helpdesk_client.fetch_ticket_detail(
        ticket_id=external_ticket_id,
        local_agent_id=current_user.user_id,
        agent_name=current_user.full_name
    )
    if not ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Ticket {external_ticket_id} not found in Freshdesk or local cache.")

    return {
        "ticket": ticket,
        "is_online": is_online,
        "status_durations_days": ticket.status_durations,
        "helpdesk_url": f"https://cascoauto.freshdesk.com/a/tickets/{external_ticket_id}"
    }

@router.post("/sync")
def trigger_read_only_sync(current_user: UserRead = Depends(get_current_user)) -> Dict[str, Any]:
    """Triggers read-only ticket fetch (GET requests only) to synchronise all tickets with Freshdesk."""
    tickets, is_online, last_sync = helpdesk_client.fetch_all_tickets_live()

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="HELPDESK_SYNC",
        entity="Freshdesk", entity_id="SYNC",
        result="SUCCESS" if is_online else "OFFLINE_FALLBACK",
        details=f"Read-only sync from cascoauto.freshdesk.com. Total Tickets: {len(tickets)}. Online: {is_online}"
    )

    return {
        "status": "success" if is_online else "warning",
        "message": "Read-only synchronisation complete from Freshdesk." if is_online
                   else "Freshdesk API offline or unreachable. Displaying last synchronised data.",
        "tickets_synced": len(tickets),
        "last_sync": last_sync,
        "is_online": is_online,
        "helpdesk_url": "https://cascoauto.freshdesk.com"
    }
