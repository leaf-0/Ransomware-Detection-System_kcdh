from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean
from sqlalchemy.sql import func
from .database import Base
import enum

class SeverityEnum(str, enum.Enum):
    info = "info"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class AlertTypeEnum(str, enum.Enum):
    ransomware = "Ransomware"
    raas = "RaaS"
    suspicious = "Suspicious"
    benign = "Benign"

class FileActionEnum(str, enum.Enum):
    created = "created"
    modified = "modified"
    deleted = "deleted"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    host = Column(String, nullable=False)
    path = Column(String, nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=False)
    fme = Column(Float, nullable=False)
    abt = Column(Float, nullable=False)
    type = Column(Enum(AlertTypeEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FileEvent(Base):
    __tablename__ = "file_events"
    
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, nullable=False)
    action = Column(Enum(FileActionEnum), nullable=False)
    fme = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
