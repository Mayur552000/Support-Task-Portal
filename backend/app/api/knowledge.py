from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.db.models import KBArticleRead, KBArticleCreate, UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])

@router.get("", response_model=List[KBArticleRead])
def get_kb_articles(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserRead = Depends(get_current_user)
):
    articles = repository.get_kb_articles(category=category)
    if not search:
        return articles

    s = search.lower()
    filtered = []
    for a in articles:
        match = (s in a.title.lower()) or (s in a.problem_summary.lower()) or any(s in check.lower() for check in a.validation_checks) or any(s in step.lower() for step in a.solution_steps)
        if match:
            filtered.append(a)
    return filtered

@router.post("", response_model=KBArticleRead)
def create_kb_article(req: KBArticleCreate, current_user: UserRead = Depends(get_current_user)):
    article_id = f"KB-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:14]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    article = KBArticleRead(
        article_id=article_id,
        title=req.title,
        category=req.category,
        problem_summary=req.problem_summary,
        validation_checks=req.validation_checks,
        solution_steps=req.solution_steps,
        related_doc_ids=req.related_doc_ids,
        related_ticket_ids=req.related_ticket_ids,
        created_at=now_str,
        updated_at=now_str
    )

    created = repository.create_kb_article(article)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="CREATE_KB_ARTICLE",
        entity="KnowledgeBase", entity_id=article_id, result="SUCCESS", details=f"Created KB article '{req.title}'"
    )
    return created

@router.get("/{article_id}", response_model=KBArticleRead)
def get_kb_detail(article_id: str, current_user: UserRead = Depends(get_current_user)):
    articles = repository.get_kb_articles()
    for a in articles:
        if a.article_id == article_id:
            return a
    raise HTTPException(status_code=404, detail=f"Knowledge article {article_id} not found.")
