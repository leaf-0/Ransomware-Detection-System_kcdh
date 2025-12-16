from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from .models import SeverityEnum, AlertTypeEnum, FileActionEnum

class UserBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class AlertBase(BaseModel):
    host: str
    path: str
    severity: SeverityEnum
    fme: float
    abt: float
    type: AlertTypeEnum

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class FileEventBase(BaseModel):
    path: str
    action: FileActionEnum
    fme: float

class FileEventCreate(FileEventBase):
    pass

class FileEventResponse(FileEventBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MetricsResponse(BaseModel):
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    ransomware_alerts: int
    raas_alerts: int
