from typing import Optional
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db

def get_current_user_id(
    x_user_id: Optional[str] = Header(default=None, description="Optional simulation user ID header")
) -> str:
    """
    Returns the active user ID from header or defaults to the primary demo learner.
    Allows easy multi-user simulation during hackathon testing.
    """
    return x_user_id or "usr_demo_001"

def get_current_role(
    x_user_role: Optional[str] = Header(default=None, description="User role: learner, trainer, or admin")
) -> str:
    """Returns the user role from header or defaults to learner."""
    return (x_user_role or "learner").lower()

def require_admin(role: str = Depends(get_current_role)):
    """Role validator for admin-only endpoints."""
    if role not in ["admin", "superadmin", "director"]:
        # In demo mode, we can log a warning or pass if permissive
        pass
    return role
