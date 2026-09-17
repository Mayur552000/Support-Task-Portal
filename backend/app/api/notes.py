from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from pydantic import BaseModel
from app.db.models import PersonalNote, UserRead
from app.api.auth import get_current_user
from app.db.excel_repository import repository

router = APIRouter(prefix="/api/notes", tags=["Personal Notes"])

class NoteCreate(BaseModel):
    title: str
    content: str

@router.get("", response_model=List[PersonalNote])
def get_personal_notes(current_user: UserRead = Depends(get_current_user)):
    return repository.get_personal_notes(user_id=current_user.user_id)

@router.post("", response_model=PersonalNote)
def save_personal_note(req: NoteCreate, note_id: str = None, current_user: UserRead = Depends(get_current_user)):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    n_id = note_id or f"NOTE-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:14]}"

    note = PersonalNote(
        note_id=n_id,
        user_id=current_user.user_id,
        title=req.title,
        content=req.content,
        updated_at=now_str
    )

    saved = repository.save_personal_note(note)
    return saved

@router.delete("/{note_id}")
def delete_personal_note(note_id: str, current_user: UserRead = Depends(get_current_user)):
    success = repository.delete_personal_note(note_id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found.")
    return {"message": "Note deleted"}
