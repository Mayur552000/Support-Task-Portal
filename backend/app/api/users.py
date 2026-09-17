from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from app.db.models import UserRead, UserCreate, UserUpdate, PasswordResetRequest
from app.db.excel_repository import repository
from app.core.security import hash_password
from app.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/users", tags=["User Management"])

@router.get("", response_model=List[UserRead])
def get_all_users(current_user: UserRead = Depends(require_roles(["ADMIN", "LEAD"]))):
    """Retrieve all configured portal users (Admin & Lead)."""
    return repository.get_user_models()

@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(req: UserCreate, current_user: UserRead = Depends(require_roles(["ADMIN"]))):
    """Create a new local or directory portal user with Helpdesk mapping (Admin only)."""
    username_val = (req.username or req.user_id or req.email.split("@")[0]).strip().lower()
    user_id_val = (req.user_id or req.username or username_val).strip()

    # Check for existing username or user_id
    existing_username = repository.get_user_by_username(username_val)
    if existing_username:
        raise HTTPException(status_code=400, detail=f"Username '{username_val}' already exists.")

    existing_uid = repository.get_user_by_id(user_id_val)
    if existing_uid:
        raise HTTPException(status_code=400, detail=f"User ID '{user_id_val}' already exists.")

    user_data = {
        "user_id": user_id_val,
        "username": username_val,
        "password_hash": hash_password(req.password),
        "full_name": req.full_name,
        "email": req.email,
        "role": req.role,
        "external_helpdesk_agent_id": str(req.external_helpdesk_agent_id or "0"),
        "is_active": req.status != "Disabled",
        "status": req.status,
        "source": req.source
    }

    created = repository.create_user(user_data)
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="CREATE_USER",
        entity="User", entity_id=created.user_id, result="SUCCESS",
        details=f"Admin created user {created.username} ({created.full_name}) with role {created.role}"
    )
    return created

@router.get("/{user_id}", response_model=UserRead)
def get_user_detail(user_id: str, current_user: UserRead = Depends(require_roles(["ADMIN", "LEAD"]))):
    """Get single user profile by user_id or username."""
    u = repository.get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return repository._dict_to_user_read(u)

@router.put("/{user_id}", response_model=UserRead)
def update_user(user_id: str, req: UserUpdate, current_user: UserRead = Depends(require_roles(["ADMIN"]))):
    """Update user information, application role, and Helpdesk Agent ID mapping (Admin only)."""
    u = repository.get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    updates = {}
    if req.full_name is not None:
        updates["full_name"] = req.full_name
    if req.email is not None:
        updates["email"] = req.email
    if req.role is not None:
        updates["role"] = req.role
    if req.external_helpdesk_agent_id is not None:
        updates["external_helpdesk_agent_id"] = str(req.external_helpdesk_agent_id)
    if req.status is not None:
        updates["status"] = req.status
        updates["is_active"] = req.status != "Disabled"
    if req.is_active is not None:
        updates["is_active"] = req.is_active
        updates["status"] = "Active" if req.is_active else "Disabled"

    updated = repository.update_user(user_id, updates)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update user.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="UPDATE_USER",
        entity="User", entity_id=user_id, result="SUCCESS",
        details=f"Admin updated user {user_id} fields: {list(updates.keys())}"
    )
    return updated

@router.post("/{user_id}/reset-password")
def admin_reset_password(user_id: str, req: PasswordResetRequest, current_user: UserRead = Depends(require_roles(["ADMIN"]))):
    """Reset a user's password (Admin only)."""
    u = repository.get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    new_hash = hash_password(req.new_password)
    ok = repository.reset_password(user_id, new_hash)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to reset password.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="RESET_PASSWORD",
        entity="User", entity_id=user_id, result="SUCCESS",
        details=f"Admin reset password for user {user_id}"
    )
    return {"status": "success", "message": f"Password for user {user_id} reset successfully."}

@router.post("/{user_id}/disable")
def disable_user(user_id: str, current_user: UserRead = Depends(require_roles(["ADMIN"]))):
    """Disable user account (Admin only)."""
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot disable your own active session account.")

    ok = repository.toggle_user_status(user_id, "Disabled")
    if not ok:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="DISABLE_USER",
        entity="User", entity_id=user_id, result="SUCCESS", details=f"Admin disabled user {user_id}"
    )
    return {"status": "success", "message": f"User {user_id} disabled successfully."}

@router.post("/{user_id}/enable")
def enable_user(user_id: str, current_user: UserRead = Depends(require_roles(["ADMIN"]))):
    """Enable user account (Admin only)."""
    ok = repository.toggle_user_status(user_id, "Active")
    if not ok:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="ENABLE_USER",
        entity="User", entity_id=user_id, result="SUCCESS", details=f"Admin enabled user {user_id}"
    )
    return {"status": "success", "message": f"User {user_id} enabled successfully."}

@router.delete("/{user_id}")
def delete_user(user_id: str, current_user: UserRead = Depends(require_roles(["ADMIN"]))):
    """De-register and remove user from portal (Admin only)."""
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active admin account.")

    ok = repository.delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="DELETE_USER",
        entity="User", entity_id=user_id, result="SUCCESS", details=f"Admin deleted user {user_id}"
    )
    return {"status": "success", "message": f"User {user_id} removed successfully."}
