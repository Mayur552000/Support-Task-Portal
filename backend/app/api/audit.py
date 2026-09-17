from fastapi import APIRouter, Depends, Query
from typing import List
from app.db.models import AuditLogRead, UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])

@router.get("", response_model=List[AuditLogRead])
def get_audit_logs(limit: int = Query(100, le=500), current_user: UserRead = Depends(get_current_user)):
    return repository.get_audit_logs(limit=limit)
