from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from app.db.models import UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository

router = APIRouter(prefix="/api/search", tags=["Global Search"])

@router.get("")
def global_search(query: str = Query(..., min_length=2), current_user: UserRead = Depends(get_current_user)) -> Dict[str, Any]:
    q = query.lower()
    results = []

    # 1. Search Tickets
    tickets = repository.get_tickets()
    for t in tickets:
        if (q in t.ticket_id.lower()) or (q in t.subject.lower()) or (q in t.description.lower()) or any(q in tag.lower() for tag in t.tags):
            results.append({
                "type": "Ticket",
                "id": t.ticket_id,
                "title": f"[{t.ticket_id}] {t.subject}",
                "snippet": t.description[:120] + "...",
                "badge": t.status,
                "priority": t.priority,
                "target_url": f"/tickets?id={t.ticket_id}"
            })

    # 2. Search Tasks
    tasks = repository.get_tasks()
    for tsk in tasks:
        if (q in tsk.task_id.lower()) or (q in tsk.title.lower()) or (q in tsk.description.lower()) or (q in tsk.project.lower()):
            results.append({
                "type": "Task",
                "id": tsk.task_id,
                "title": f"[{tsk.task_id}] {tsk.title}",
                "snippet": tsk.description[:120] + "...",
                "badge": tsk.status,
                "priority": tsk.priority,
                "target_url": f"/tasks?id={tsk.task_id}"
            })

    # 3. Search Updates
    for t in tickets:
        for u in t.updates:
            if q in u.update_text.lower():
                results.append({
                    "type": "Update",
                    "id": u.update_id,
                    "title": f"Update on {t.ticket_id} by {u.agent_name}",
                    "snippet": u.update_text[:120] + "...",
                    "badge": u.status_after or "Logged",
                    "priority": t.priority,
                    "target_url": f"/tickets?id={t.ticket_id}"
                })

    # 4. Search Documentation
    docs = repository.get_documents()
    for d in docs:
        if (q in d.title.lower()) or (q in d.description.lower()) or (q in d.category.lower()) or any(q in tag.lower() for tag in d.tags):
            results.append({
                "type": "Document",
                "id": d.doc_id,
                "title": f"[{d.category}] {d.title} (v{d.version})",
                "snippet": d.description[:120] + "...",
                "badge": d.category,
                "priority": "Normal",
                "target_url": "/knowledge?tab=docs"
            })

    # 5. Search Knowledge Base
    articles = repository.get_kb_articles()
    for a in articles:
        if (q in a.title.lower()) or (q in a.problem_summary.lower()) or (q in a.category.lower()):
            results.append({
                "type": "Knowledge Base",
                "id": a.article_id,
                "title": f"[KB] {a.title}",
                "snippet": a.problem_summary[:120] + "...",
                "badge": a.category,
                "priority": "Article",
                "target_url": f"/knowledge?tab=kb&article={a.article_id}"
            })

    return {
        "query": query,
        "total_results": len(results),
        "results": results
    }
