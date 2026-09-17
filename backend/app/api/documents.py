from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import List, Optional
import os
from datetime import datetime
from app.db.models import DocumentRead, UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository
from app.core.config import settings

router = APIRouter(prefix="/api/documents", tags=["Documentation"])

@router.get("", response_model=List[DocumentRead])
def get_documents(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserRead = Depends(get_current_user)
):
    docs = repository.get_documents(category=category)
    if not search:
        return docs

    s = search.lower()
    filtered = []
    for d in docs:
        if (s in d.title.lower()) or (s in d.description.lower()) or any(s in tag.lower() for tag in d.tags):
            filtered.append(d)
    return filtered

@router.post("", response_model=DocumentRead)
def upload_document(
    title: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    version: str = Form("1.0"),
    tags: str = Form(""),
    related_item_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: UserRead = Depends(get_current_user)
):
    doc_id = f"DOC-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:14]}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    file_path = None
    if file:
        file_ext = os.path.splitext(file.filename)[1]
        safe_filename = f"{doc_id}{file_ext}"
        saved_location = os.path.join(settings.UPLOADS_DATA_DIR, safe_filename)
        with open(saved_location, "wb") as f:
            f.write(file.file.read())
        file_path = f"/uploads/{safe_filename}"

    tags_list = [t.strip() for t in tags.split(",") if t.strip()]

    doc = DocumentRead(
        doc_id=doc_id,
        title=title,
        category=category,
        description=description,
        version=version,
        uploaded_by_id=current_user.user_id,
        uploaded_by_name=current_user.full_name,
        uploaded_date=now_str,
        modified_date=now_str,
        file_path=file_path,
        tags=tags_list,
        related_item_id=related_item_id
    )

    created = repository.create_document(doc)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="UPLOAD_DOC",
        entity="Document", entity_id=doc_id, result="SUCCESS", details=f"Uploaded document '{title}' in category '{category}'"
    )
    return created

@router.delete("/{doc_id}")
def delete_document(doc_id: str, current_user: UserRead = Depends(get_current_user)):
    success = repository.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="DELETE_DOC",
        entity="Document", entity_id=doc_id, result="SUCCESS", details=f"Deleted document {doc_id}"
    )
    return {"message": "Document deleted successfully"}
