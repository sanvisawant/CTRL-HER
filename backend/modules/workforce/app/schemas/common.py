from typing import Generic, TypeVar, Optional, Any, List
from pydantic import BaseModel

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None

class StatusBadge(BaseModel):
    label: str # Critical, Moderate, Proficient
    color: str # red, amber, green
    level_range: str # e.g. "< 2.5", "2.5 - 3.5", "> 3.5"
