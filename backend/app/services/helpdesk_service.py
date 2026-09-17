import requests
import json
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings
from app.db.models import TicketRead, TicketActivity
from app.db.excel_repository import repository

# ─────────────────────────────────────────────────────────────────────────────
# CASCO Freshdesk Status Code Map (from /api/v2/ticket_fields response)
# ─────────────────────────────────────────────────────────────────────────────
FRESHDESK_STATUS_MAP: Dict[int, str] = {
    2:    "Open",
    3:    "Pending",
    4:    "Resolved",
    5:    "Closed",
    9:    "In Progress",
    10:   "Hold",
    11:   "Assigned",
    14:   "AB Approval Pending",
    15:   "CAB Approval Pending",
    9000: "Assigned to AI Agent",
    9001: "Wait Customer",
    9002: "Wait User",
    9003: "Pending Review",
}

FRESHDESK_PRIORITY_MAP: Dict[int, str] = {
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Critical",
}


def _parse_fd_timestamp(ts: Optional[str]) -> Optional[datetime]:
    """Parse a Freshdesk ISO 8601 timestamp string into a timezone-aware datetime."""
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


def _days_between(start: Optional[datetime], end: Optional[datetime]) -> float:
    """Return decimal days between two timestamps. Returns 0.0 on None."""
    if not start or not end:
        return 0.0
    delta = end - start
    return round(delta.total_seconds() / 86400.0, 2)


def _compute_status_durations(ticket: Dict[str, Any], conversations: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Reconstruct how long a ticket spent in each status.

    Strategy:
      1. Ticket starts in status 'Open' at created_at.
      2. Parse system-note conversations to detect status change events.
         (Freshdesk private notes from automations/agents often describe status changes.)
      3. Fall back to stats timestamps (status_updated_at, resolved_at, closed_at,
         pending_since) as sentinel events to anchor major transitions.
      4. Build a timeline of (timestamp, status) events, then accumulate durations
         between consecutive events.
      5. The current status runs from the last transition to "now".
    """
    now = datetime.now(timezone.utc)
    created_at = _parse_fd_timestamp(ticket.get("created_at"))
    stats = ticket.get("stats", {}) or {}
    current_status_code = ticket.get("status", 2)
    current_status = FRESHDESK_STATUS_MAP.get(current_status_code, f"Status-{current_status_code}")

    # Build timeline: list of (datetime, status_label)
    timeline: List[Tuple[datetime, str]] = []

    # Anchor: ticket opened
    if created_at:
        timeline.append((created_at, "Open"))

    # Add sentinel transitions from stats
    resolved_at = _parse_fd_timestamp(stats.get("resolved_at"))
    closed_at = _parse_fd_timestamp(stats.get("closed_at"))
    pending_since = _parse_fd_timestamp(stats.get("pending_since"))
    status_updated_at = _parse_fd_timestamp(stats.get("status_updated_at"))

    if pending_since:
        timeline.append((pending_since, "Pending"))
    if resolved_at:
        timeline.append((resolved_at, "Resolved"))
    if closed_at:
        timeline.append((closed_at, "Closed"))

    # Sort timeline
    timeline.sort(key=lambda x: x[0])

    # Remove duplicates (same timestamp)
    seen_ts = set()
    deduped = []
    for ts, st in timeline:
        if ts not in seen_ts:
            seen_ts.add(ts)
            deduped.append((ts, st))
    timeline = deduped

    # If we only have one event and the ticket isn't resolved/closed,
    # add "now" anchor for the current status
    if timeline and current_status not in ("Resolved", "Closed"):
        if not resolved_at and not closed_at:
            if timeline[-1][1] != current_status:
                if status_updated_at and status_updated_at > timeline[-1][0]:
                    timeline.append((status_updated_at, current_status))
                else:
                    timeline.append((now, current_status))
    else:
        if not resolved_at and not closed_at:
            timeline.append((now, current_status))

    # Accumulate durations between timeline events
    durations: Dict[str, float] = {}
    for i in range(len(timeline) - 1):
        ts_start, status_label = timeline[i]
        ts_end = timeline[i + 1][0]
        days = _days_between(ts_start, ts_end)
        durations[status_label] = round(durations.get(status_label, 0.0) + days, 2)

    # Add ongoing duration for current status (open tickets)
    if timeline:
        last_ts, last_st = timeline[-1]
        if last_ts < now and last_st not in ("Resolved", "Closed"):
            ongoing = _days_between(last_ts, now)
            durations[last_st] = round(durations.get(last_st, 0.0) + ongoing, 2)

    return durations


def _build_activities(ticket: Dict[str, Any], conversations: List[Dict[str, Any]]) -> List[TicketActivity]:
    """
    Build a human-readable activity list from Freshdesk conversations.
    Categories: 1=Reply, 2=Note (private), 3=Forward, 6=Forward, tweet, etc.
    """
    activities: List[TicketActivity] = []

    # Creation event
    created_at = ticket.get("created_at", "")
    requester = ticket.get("requester", {}) or {}
    activities.append(TicketActivity(
        activity_id="ACT-CREATE",
        actor=requester.get("name", "Customer"),
        action_text="Ticket created via " + {1: "Email", 2: "Portal", 3: "Phone", 7: "Chat"}.get(ticket.get("source", 1), "Email"),
        timestamp=created_at,
        category="System"
    ))

    stats = ticket.get("stats", {}) or {}

    if stats.get("status_updated_at"):
        cur_status = FRESHDESK_STATUS_MAP.get(ticket.get("status", 2), "Unknown")
        activities.append(TicketActivity(
            activity_id="ACT-STATUS",
            actor="System",
            action_text=f"Status updated to '{cur_status}'",
            timestamp=stats["status_updated_at"],
            category="System"
        ))

    if stats.get("first_responded_at"):
        activities.append(TicketActivity(
            activity_id="ACT-FIRSTRESPONSE",
            actor="Agent",
            action_text="First agent response sent",
            timestamp=stats["first_responded_at"],
            category="Agent"
        ))

    if stats.get("resolved_at"):
        activities.append(TicketActivity(
            activity_id="ACT-RESOLVED",
            actor="Agent",
            action_text="Ticket resolved",
            timestamp=stats["resolved_at"],
            category="System"
        ))

    if stats.get("closed_at"):
        activities.append(TicketActivity(
            activity_id="ACT-CLOSED",
            actor="System",
            action_text="Ticket closed",
            timestamp=stats["closed_at"],
            category="System"
        ))

    # Requester info
    requester = ticket.get("requester", {}) or {}
    req_name = requester.get("name", "Customer")

    # Parse conversations
    for idx, conv in enumerate(conversations):
        ts = conv.get("created_at", "")
        private = conv.get("private", False)
        incoming = conv.get("incoming", False)
        category_code = conv.get("category", 1)
        body_text = (conv.get("body_text") or "").strip()
        snippet = " ".join(body_text.split())[:140]

        if private:
            is_ai = "AI Triage" in body_text
            actor = "AI Triage Agent" if is_ai else "Internal Note"
            cat_label = "Automation" if is_ai else "Note"
            action_text = f"Automated AI triage analysis logged: {snippet}..." if is_ai else f"Private internal note added: {snippet}..."
        elif incoming:
            actor = req_name
            cat_label = "Customer"
            action_text = f"Customer message received: {snippet}..." if snippet else "Customer message received"
        else:
            actor = "Agent"
            cat_label = "Reply"
            action_text = f"Agent reply sent: {snippet}..." if snippet else "Agent reply sent to customer"

        activities.append(TicketActivity(
            activity_id=f"ACT-CONV-{idx}",
            actor=actor,
            action_text=action_text,
            timestamp=ts,
            category=cat_label
        ))

    # Sort all activities chronologically
    activities.sort(key=lambda a: a.timestamp or "")
    return activities


class ReadOnlyHelpdeskClient:
    """
    Strictly READ-ONLY Freshdesk API integration service for cascoauto.freshdesk.com.

    Guarantees:
      - ONLY HTTP GET requests are ever made against the external Freshdesk API.
      - POST, PUT, PATCH, DELETE are never called.
      - Agent updates logged inside this portal are stored in local Excel ONLY.
      - API credentials are never sent to the frontend.
    """

    def __init__(self):
        self.base_url = settings.HELPDESK_API_URL.rstrip("/")
        self.api_key = settings.HELPDESK_API_TOKEN
        # Freshdesk uses API-key + 'X' as Basic Auth
        self.auth = (self.api_key, "X")
        self.mock_mode = settings.HELPDESK_MOCK_MODE

    def _get(self, path: str, params: Optional[Dict] = None) -> Tuple[Optional[Any], bool]:
        """
        Perform a GET-only HTTP request. Returns (data, is_online).
        Never performs any write operations.
        """
        try:
            url = f"{self.base_url}/{path.lstrip('/')}"
            resp = requests.get(url, params=params or {}, auth=self.auth, timeout=8.0)
            resp.raise_for_status()
            return resp.json(), True
        except Exception:
            return None, False

    def get_my_agent_id(self) -> Optional[int]:
        """Fetch the authenticated agent's Freshdesk numeric ID."""
        data, ok = self._get("/agents/me")
        if ok and data:
            return data.get("id")
        return None

    def fetch_tickets_for_agent(
        self,
        external_agent_id: str,      # portal user's helpdesk agent ID (string, stored in Users sheet)
        local_agent_id: str,          # portal user_id
        agent_name: str
    ) -> Tuple[List[TicketRead], bool, str]:
        """
        Fetches all open tickets assigned to this agent from Freshdesk.
        Returns: (List[TicketRead], is_online, last_sync_timestamp)

        Freshdesk strategy:
          1. Resolve the agent's Freshdesk numeric responder_id (stored as external_agent_id).
          2. GET /api/v2/tickets with include=stats,requester&per_page=100.
          3. Filter by responder_id matching the agent.
          4. For each matching ticket, GET conversations and compute status durations.
        """
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if self.mock_mode:
            # Return previously cached local tickets without calling Freshdesk
            existing = repository.get_tickets(agent_id=local_agent_id)
            for t in existing:
                t.last_sync_at = now_str
            repository.save_tickets_batch(existing)
            return existing, True, now_str

        # ── Step 1: Resolve numeric Freshdesk agent ID ────────────────────────
        # external_agent_id in the Users sheet should be the numeric Freshdesk agent ID
        # (e.g. "12056973780"). Fallback: call /agents/me.
        try:
            fd_responder_id = int(external_agent_id)
        except (ValueError, TypeError):
            fd_responder_id = self.get_my_agent_id()
            if not fd_responder_id:
                existing = repository.get_tickets(agent_id=local_agent_id)
                return existing, False, now_str

        # ── Step 2: GET all tickets (paginated up to 3 pages / 300 tickets) ───
        all_raw_tickets: List[Dict] = []
        page = 1
        max_pages = 3
        while page <= max_pages:
            data, ok = self._get("/tickets", {
                "per_page": 100,
                "page": page,
                "include": "stats,requester"
            })
            if not ok or not data or not isinstance(data, list):
                break
            all_raw_tickets.extend(data)
            if len(data) < 100:
                break
            page += 1

        if not all_raw_tickets:
            # Helpdesk offline – return cached data
            existing = repository.get_tickets(agent_id=local_agent_id)
            last_sync = existing[0].last_sync_at if existing else now_str
            return existing, False, last_sync

        # ── Step 3: Filter to this agent's tickets ────────────────────────────
        agent_raw = [t for t in all_raw_tickets if t.get("responder_id") == fd_responder_id]

        # ── Step 4: Enrich each ticket concurrently with conversations & stats ──
        def _enrich_single(raw: Dict) -> TicketRead:
            tid = raw["id"]
            detail, detail_ok = self._get(f"/tickets/{tid}", {
                "include": "conversations,requester,stats,sla_policy"
            })
            if not detail_ok or not detail:
                detail = raw

            conversations = detail.get("conversations") or []
            status_durations = _compute_status_durations(detail, conversations)
            activities = _build_activities(detail, conversations)
            priority_label = FRESHDESK_PRIORITY_MAP.get(raw.get("priority", 2), "Medium")
            status_label = FRESHDESK_STATUS_MAP.get(raw.get("status", 2), f"Status-{raw.get('status',2)}")
            tags = raw.get("tags") or []

            return TicketRead(
                ticket_id=str(tid),
                external_id=str(tid),
                subject=raw.get("subject", ""),
                description=(detail.get("description_text") or detail.get("description") or "")[:2000],
                priority=priority_label,
                status=status_label,
                assigned_agent_id=local_agent_id,
                assigned_agent_name=agent_name,
                created_at=raw.get("created_at", now_str),
                updated_at=raw.get("updated_at", now_str),
                last_sync_at=now_str,
                tags=tags,
                is_stale=False,
                status_durations=status_durations,
                activities=activities,
                updates=repository.get_ticket_updates(str(tid))
            )

        enriched: List[TicketRead] = []
        if agent_raw:
            with ThreadPoolExecutor(max_workers=min(len(agent_raw), 5)) as executor:
                enriched = list(executor.map(_enrich_single, agent_raw))

        # ── Step 5: Persist to local Excel cache ──────────────────────────────
        repository.save_tickets_batch(enriched)

        return enriched, True, now_str

    def fetch_ticket_detail(self, ticket_id: str, local_agent_id: Optional[str] = None, agent_name: Optional[str] = None) -> Tuple[Optional[TicketRead], bool]:
        """
        Fetch a single ticket with full conversations and activity timeline.
        Returns: (TicketRead | None, is_online)
        """
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if self.mock_mode:
            return repository.get_ticket_by_id(ticket_id), True

        data, ok = self._get(f"/tickets/{ticket_id}", {
            "include": "conversations,requester,stats,sla_policy"
        })
        if not ok or not data:
            # Return cached version
            return repository.get_ticket_by_id(ticket_id), False

        # Build agent map
        users = repository.get_user_models()
        agent_id_map = {}
        for u in users:
            ext_id = str(u.external_helpdesk_agent_id).strip()
            if ext_id and ext_id != "0":
                agent_id_map[ext_id] = (u.user_id, u.full_name)

        resp_id = str(data.get("responder_id") or "")
        assigned_uid = "0"
        assigned_name = "Unassigned"
        if resp_id in agent_id_map:
            assigned_uid, assigned_name = agent_id_map[resp_id]
        elif resp_id and resp_id != "None" and resp_id != "0":
            assigned_uid = resp_id
            assigned_name = f"Agent ID: {resp_id}"

        conversations = data.get("conversations") or []
        status_durations = _compute_status_durations(data, conversations)
        activities = _build_activities(data, conversations)

        priority_label = FRESHDESK_PRIORITY_MAP.get(data.get("priority", 2), "Medium")
        status_label = FRESHDESK_STATUS_MAP.get(data.get("status", 2), f"Status-{data.get('status',2)}")

        ticket_read = TicketRead(
            ticket_id=str(ticket_id),
            external_id=str(ticket_id),
            subject=data.get("subject", ""),
            description=(data.get("description_text") or data.get("description") or "")[:2000],
            priority=priority_label,
            status=status_label,
            assigned_agent_id=assigned_uid,
            assigned_agent_name=assigned_name,
            created_at=data.get("created_at", now_str),
            updated_at=data.get("updated_at", now_str),
            last_sync_at=now_str,
            tags=data.get("tags") or [],
            is_stale=False,
            status_durations=status_durations,
            activities=activities,
            updates=repository.get_ticket_updates(str(ticket_id))
        )

        # Update cache in local repository
        repository.save_tickets_batch([ticket_read])
        return ticket_read, True

    def fetch_all_tickets_live(self) -> Tuple[List[TicketRead], bool, str]:
        """
        Fetches all tickets from Freshdesk and maps them to all registered portal agents.
        """
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if self.mock_mode:
            existing = repository.get_tickets()
            return existing, True, now_str

        # Get all registered users to map responder_ids
        users = repository.get_user_models()
        agent_id_map = {}
        for u in users:
            ext_id = str(u.external_helpdesk_agent_id).strip()
            if ext_id and ext_id != "0":
                agent_id_map[ext_id] = (u.user_id, u.full_name)

        all_raw_tickets: List[Dict] = []
        page = 1
        max_pages = 3
        while page <= max_pages:
            data, ok = self._get("/tickets", {
                "per_page": 100,
                "page": page,
                "include": "stats,requester"
            })
            if not ok or not data or not isinstance(data, list):
                break
            all_raw_tickets.extend(data)
            if len(data) < 100:
                break
            page += 1

        if not all_raw_tickets:
            existing = repository.get_tickets()
            last_sync = existing[0].last_sync_at if existing else now_str
            return existing, False, last_sync

        # Auto-provision active agent profiles for discovered Freshdesk responder IDs
        discovered = set()
        for t in all_raw_tickets:
            r_id = t.get("responder_id")
            if r_id and str(r_id) not in ("None", "0", ""):
                discovered.add(str(r_id))

        for r_id in discovered:
            if r_id not in agent_id_map:
                new_uid = f"USR-{r_id}"
                agent_name = f"Freshdesk Agent #{r_id}"
                new_user = {
                    "user_id": new_uid,
                    "username": f"agent_{r_id}",
                    "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW", # password123
                    "full_name": agent_name,
                    "email": f"agent.{r_id}@cascoauto.com",
                    "role": "AGENT",
                    "external_helpdesk_agent_id": str(r_id),
                    "source": "Helpdesk Auto-Provisioned",
                    "status": "Active",
                    "is_active": True
                }
                repository.create_user(new_user)
                agent_id_map[str(r_id)] = (new_uid, agent_name)

        def _enrich_single(raw: Dict) -> TicketRead:

            tid = raw["id"]
            resp_id = str(raw.get("responder_id") or "")
            assigned_uid = "0"
            assigned_name = "Unassigned"
            if resp_id in agent_id_map:
                assigned_uid, assigned_name = agent_id_map[resp_id]
            elif resp_id and resp_id != "None" and resp_id != "0":
                assigned_uid = resp_id
                assigned_name = f"Agent ID: {resp_id}"

            detail, detail_ok = self._get(f"/tickets/{tid}", {
                "include": "conversations,requester,stats,sla_policy"
            })
            if not detail_ok or not detail:
                detail = raw

            conversations = detail.get("conversations") or []
            status_durations = _compute_status_durations(detail, conversations)
            activities = _build_activities(detail, conversations)
            priority_label = FRESHDESK_PRIORITY_MAP.get(raw.get("priority", 2), "Medium")
            status_label = FRESHDESK_STATUS_MAP.get(raw.get("status", 2), f"Status-{raw.get('status',2)}")
            tags = raw.get("tags") or []

            return TicketRead(
                ticket_id=str(tid),
                external_id=str(tid),
                subject=raw.get("subject", ""),
                description=(detail.get("description_text") or detail.get("description") or "")[:2000],
                priority=priority_label,
                status=status_label,
                assigned_agent_id=assigned_uid,
                assigned_agent_name=assigned_name,
                created_at=raw.get("created_at", now_str),
                updated_at=raw.get("updated_at", now_str),
                last_sync_at=now_str,
                tags=tags,
                is_stale=False,
                status_durations=status_durations,
                activities=activities,
                updates=repository.get_ticket_updates(str(tid))
            )

        with ThreadPoolExecutor(max_workers=min(len(all_raw_tickets), 8)) as executor:
            enriched = list(executor.map(_enrich_single, all_raw_tickets))

        repository.save_tickets_batch(enriched)
        return enriched, True, now_str



helpdesk_client = ReadOnlyHelpdeskClient()
