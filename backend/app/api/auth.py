from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from typing import List
from app.db.models import LoginRequest, Token, UserRead, ChangePasswordRequest
from app.db.excel_repository import repository
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRead:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_dict = repository.get_user_by_id(payload.get("sub"))
    if not user_dict:
        raise HTTPException(status_code=401, detail="User not found.")

    status_val = str(user_dict.get("status", "Active"))
    if status_val == "Disabled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled. Please contact an administrator.")

    return repository._dict_to_user_read(user_dict)

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: UserRead = Depends(get_current_user)) -> UserRead:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

@router.post("/login", response_model=Token)
def login(req: LoginRequest):
    user = repository.get_user_by_username(req.username)
    if not user or not verify_password(req.password, str(user.get("password_hash"))):
        repository.add_audit_log(
            user_id="UNKNOWN", username=req.username, action="LOGIN_FAILED",
            entity="Auth", entity_id="AUTH", result="FAILURE", details="Invalid username or password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please try again."
        )

    status_val = str(user.get("status", "Active"))
    if status_val == "Disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact an administrator."
        )

    user_read = repository._dict_to_user_read(user)
    access_token = create_access_token(data={"sub": user_read.user_id, "username": user_read.username, "role": user_read.role})

    repository.add_audit_log(
        user_id=user_read.user_id, username=user_read.username, action="LOGIN_SUCCESS",
        entity="Auth", entity_id=user_read.user_id, result="SUCCESS", details="Agent logged in successfully"
    )

    return Token(access_token=access_token, token_type="bearer", user=user_read)

@router.get("/me", response_model=UserRead)
def get_me(current_user: UserRead = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: UserRead = Depends(get_current_user)):
    u = repository.get_user_by_id(current_user.user_id)
    if not u or not verify_password(req.current_password, str(u.get("password_hash"))):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    new_hash = hash_password(req.new_password)
    ok = repository.reset_password(current_user.user_id, new_hash)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update password.")

    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="CHANGE_PASSWORD",
        entity="User", entity_id=current_user.user_id, result="SUCCESS", details="User changed their password"
    )
    return {"status": "success", "message": "Password changed successfully"}

@router.post("/logout")
def logout(current_user: UserRead = Depends(get_current_user)):
    repository.add_audit_log(
        user_id=current_user.user_id, username=current_user.username, action="LOGOUT",
        entity="Auth", entity_id=current_user.user_id, result="SUCCESS", details="Agent logged out"
    )
    return {"message": "Logged out successfully"}
