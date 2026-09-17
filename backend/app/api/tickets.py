from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional
from datetime import datetime
from app.db.models import TicketRead, TicketUpdateCreate, TicketUpdateRead, UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository
from app.services.export_service import export_to_excel

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

@router.get("", response_model=List[TicketRead])
def get_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    current_user: UserRead = Depends(get_current_user)
):
    target_agent = None
    if agent_id and agent_id.lower() != "all":
        target_agent = agent_id

    tickets = repository.get_tickets(agent_id=target_agent)

    # Support comma-separated status list e.g. "Open,In Progress,Pending"
    status_list = [s.strip().lower() for s in status.split(",") if s.strip()] if status else []

    filtered = []
    for t in tickets:
        if status_list:
            if t.status.lower() not in status_list:
                continue
        if priority and t.priority.lower() != priority.lower():
            continue
        if search:
            s = search.lower()
            match = (
                (s in t.ticket_id.lower()) or 
                (s in t.external_id.lower()) or 
                (s in t.subject.lower()) or 
                (s in t.description.lower()) or 
                (s in t.assigned_agent_name.lower()) or 
                any(s in tag.lower() for tag in t.tags)
            )
            if not match:
                continue
        filtered.append(t)

    return filtered


@router.get("/export")
def export_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserRead = Depends(get_current_user)
):
    tickets = get_tickets(status=status, priority=priority, search=search, current_user=current_user)
    headers = ["Ticket ID", "Subject", "Priority", "Status", "Assigned Agent", "Created Date", "Last Sync", "Tags"]
    data = []
    for t in tickets:
        data.append([
            t.ticket_id, t.subject, t.priority, t.status, t.assigned_agent_name,
            t.created_at, t.last_sync_at, ", ".join(t.tags)
        ])
    
    excel_stream = export_to_excel("My Tickets", headers, data)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="EXPORT_EXCEL",
        entity="Tickets", entity_id="ALL", result="SUCCESS", details="Exported tickets to Excel"
    )
    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=CASCO_My_Tickets.xlsx"}
    )

from app.services.helpdesk_service import helpdesk_client

@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket_detail(ticket_id: str, current_user: UserRead = Depends(get_current_user)):
    t = repository.get_ticket_by_id(ticket_id)
    # If ticket not found locally, or if status_durations is empty, fetch live from Freshdesk
    if not t or not t.status_durations:
        live_ticket, is_online = helpdesk_client.fetch_ticket_detail(
            ticket_id=ticket_id,
            local_agent_id=current_user.user_id,
            agent_name=current_user.full_name
        )
        if live_ticket:
            return live_ticket

    if not t:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")
    return t

@router.get("/{ticket_id}/updates", response_model=List[TicketUpdateRead])
def get_ticket_updates(ticket_id: str, current_user: UserRead = Depends(get_current_user)):
    return repository.get_ticket_updates(ticket_id)

@router.post("/{ticket_id}/updates", response_model=TicketUpdateRead)
def create_ticket_update(ticket_id: str, req: TicketUpdateCreate, current_user: UserRead = Depends(get_current_user)):
    t = repository.get_ticket_by_id(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")

    update_id = f"TUPD-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:14]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    upd_record = TicketUpdateRead(
        update_id=update_id,
        ticket_id=t.ticket_id,
        agent_id=current_user.user_id,
        agent_name=current_user.full_name,
        update_text=req.update_text,
        status_after=req.status or t.status,
        timestamp=now_str,
        next_action=req.next_action,
        follow_up_date=req.follow_up_date
    )

    # Save to local repository ONLY. (DO NOT send to Helpdesk!)
    repository.add_ticket_update(upd_record)

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="ADD_TICKET_UPDATE",
        entity="Ticket", entity_id=t.ticket_id, result="SUCCESS", details=f"Added update to ticket {t.ticket_id}"
    )

    return upd_record
