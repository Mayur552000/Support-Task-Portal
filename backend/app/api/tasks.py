from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional
from datetime import datetime
from app.db.models import TaskRead, TaskCreate, TaskUpdateCreate, TaskUpdateRead, UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository
from app.services.export_service import export_to_excel

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskRead])
def get_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserRead = Depends(get_current_user)
):
    tasks = repository.get_tasks(assignee_id=current_user.user_id if current_user.role == "AGENT" else None)

    filtered = []
    for t in tasks:
        if status and t.status.lower() != status.lower():
            continue
        if priority and t.priority.lower() != priority.lower():
            continue
        if category and t.category.lower() != category.lower():
            continue
        if search:
            s = search.lower()
            match = (s in t.task_id.lower()) or (s in t.title.lower()) or (s in t.description.lower()) or (s in t.project.lower())
            if not match:
                continue
        filtered.append(t)

    return filtered

@router.get("/export")
def export_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserRead = Depends(get_current_user)
):
    tasks = get_tasks(status=status, priority=priority, search=search, current_user=current_user)
    headers = ["Task ID", "Title", "Project", "Category", "Priority", "Status", "Assignee", "Due Date", "Completion %"]
    data = []
    for t in tasks:
        data.append([
            t.task_id, t.title, t.project, t.category, t.priority, t.status,
            t.assignee_name, t.due_date, f"{t.completion_pct}%"
        ])

    excel_stream = export_to_excel("My Tasks", headers, data)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="EXPORT_EXCEL",
        entity="Tasks", entity_id="ALL", result="SUCCESS", details="Exported tasks to Excel"
    )
    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=CASCO_My_Tasks.xlsx"}
    )

@router.post("", response_model=TaskRead)
def create_task(req: TaskCreate, current_user: UserRead = Depends(get_current_user)):
    task_id = f"TASK-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:14]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    task = TaskRead(
        task_id=task_id,
        title=req.title,
        description=req.description,
        project=req.project,
        category=req.category,
        priority=req.priority,
        status=req.status,
        assignee_id=req.assignee_id,
        assignee_name=req.assignee_name,
        start_date=req.start_date,
        due_date=req.due_date,
        completion_pct=req.completion_pct,
        created_at=now_str,
        updated_at=now_str,
        related_ticket_id=req.related_ticket_id,
        is_overdue=False,
        updates=[]
    )

    created = repository.create_task(task)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="CREATE_TASK",
        entity="Task", entity_id=task_id, result="SUCCESS", details=f"Created task '{req.title}'"
    )
    return created

@router.get("/{task_id}", response_model=TaskRead)
def get_task_detail(task_id: str, current_user: UserRead = Depends(get_current_user)):
    t = repository.get_task_by_id(task_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    return t

@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: str, req: dict, current_user: UserRead = Depends(get_current_user)):
    updated = repository.update_task(task_id, req)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="UPDATE_TASK",
        entity="Task", entity_id=task_id, result="SUCCESS", details=f"Updated task attributes for {task_id}"
    )
    return updated

@router.get("/{task_id}/updates", response_model=List[TaskUpdateRead])
def get_task_updates(task_id: str, current_user: UserRead = Depends(get_current_user)):
    return repository.get_task_updates(task_id)

@router.post("/{task_id}/updates", response_model=TaskUpdateRead)
def create_task_update(task_id: str, req: TaskUpdateCreate, current_user: UserRead = Depends(get_current_user)):
    t = repository.get_task_by_id(task_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    update_id = f"TKUPD-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:14]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    upd_record = TaskUpdateRead(
        update_id=update_id,
        task_id=t.task_id,
        agent_id=current_user.user_id,
        agent_name=current_user.full_name,
        update_text=req.update_text,
        status_after=req.status or t.status,
        completion_pct_after=req.completion_pct if req.completion_pct is not None else t.completion_pct,
        timestamp=now_str
    )

    repository.add_task_update(upd_record)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="ADD_TASK_UPDATE",
        entity="Task", entity_id=t.task_id, result="SUCCESS", details=f"Added work update to task {t.task_id}"
    )

    return upd_record
