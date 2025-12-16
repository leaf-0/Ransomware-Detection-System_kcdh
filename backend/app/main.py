from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager
import uvicorn
from jose import JWTError, jwt

from .database import get_db, engine
from .models import Base, User, Alert, FileEvent, SeverityEnum, AlertTypeEnum
from .schemas import (
    UserCreate,
    UserResponse,
    Token,
    AlertResponse,
    AlertCreate,
    FileEventResponse,
    FileEventCreate,
    MetricsResponse,
)
from .auth import authenticate_user, create_access_token, get_current_user, get_password_hash, SECRET_KEY, ALGORITHM
from .monitoring import start_file_monitoring, stop_file_monitoring, get_monitoring_status
from .websocket import manager
from .background_jobs import start_background_services, stop_background_services, get_background_services_status

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background services
    start_background_services()
    yield
    # Shutdown: Stop all services
    stop_background_services()
    stop_file_monitoring()

app = FastAPI(title="RansomGuard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    skip: int = 0,
    limit: int = 100,
    severity: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    alerts = query.offset(skip).limit(limit).all()
    return alerts

@app.get("/file-events", response_model=List[FileEventResponse])
async def get_file_events(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(FileEvent).offset(skip).limit(limit).all()
    return events

@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == SeverityEnum.critical).count()
    high_alerts = db.query(Alert).filter(Alert.severity == SeverityEnum.high).count()
    ransomware_alerts = db.query(Alert).filter(Alert.type == AlertTypeEnum.ransomware).count()
    raas_alerts = db.query(Alert).filter(Alert.type == AlertTypeEnum.raas).count()
    
    return MetricsResponse(
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        high_alerts=high_alerts,
        ransomware_alerts=ransomware_alerts,
        raas_alerts=raas_alerts
    )

@app.post("/alerts", response_model=AlertResponse)
async def create_alert(
    alert: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_alert = Alert(
        host=alert.host,
        path=alert.path,
        severity=alert.severity,
        fme=alert.fme,
        abt=alert.abt,
        type=alert.type
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    await manager.broadcast_new_alert(db_alert, current_user.email)
    return db_alert

@app.post("/file-events", response_model=FileEventResponse)
async def create_file_event(
    event: FileEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_event = FileEvent(
        path=event.path,
        action=event.action,
        fme=event.fme
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    await manager.broadcast_new_file_event(db_event, current_user.email)
    return db_event

@app.websocket("/ws/{user_email}")
async def websocket_endpoint(websocket: WebSocket, user_email: str):
    # Validate JWT from query param and ensure it matches the user_email
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None or email != user_email:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_email)
    try:
        while True:
            raw = await websocket.receive_text()
            # Echo back received messages for connectivity checks
            try:
                import json as _json
                parsed = _json.loads(raw)
            except Exception:
                parsed = {"message": raw}
            await manager.send_personal_message({"type": "echo", "data": parsed}, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_email)

@app.post("/monitoring/start")
async def start_monitoring_endpoint(
    paths: List[str] = Body(default=None),
    current_user: User = Depends(get_current_user)
):
    """Start file system monitoring"""
    success = start_file_monitoring(paths)
    if success:
        return {"status": "started", "message": "File monitoring started successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to start file monitoring")

@app.post("/monitoring/stop")
async def stop_monitoring_endpoint(current_user: User = Depends(get_current_user)):
    """Stop file system monitoring"""
    stop_file_monitoring()
    return {"status": "stopped", "message": "File monitoring stopped"}

@app.get("/monitoring/status")
async def get_monitoring_status_endpoint(current_user: User = Depends(get_current_user)):
    """Get current monitoring status"""
    status = get_monitoring_status()
    status["background_services"] = get_background_services_status()
    return status

@app.post("/test/alert")
async def create_test_alert(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a test alert for demonstration"""
    import random
    from .models import SeverityEnum, AlertTypeEnum
    
    test_alert = Alert(
        host=f"test-host-{random.randint(1, 5)}",
        path=f"/test/file_{random.randint(1000, 9999)}.enc",
        severity=random.choice(list(SeverityEnum)),
        fme=random.uniform(5.0, 8.5),
        abt=random.uniform(2.0, 5.0),
        type=random.choice(list(AlertTypeEnum))
    )
    db.add(test_alert)
    db.commit()
    db.refresh(test_alert)
    await manager.broadcast_new_alert(test_alert, current_user.email)
    return test_alert

@app.post("/test/file-event")
async def create_test_file_event(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a test file event for demonstration"""
    import random
    from .models import FileActionEnum
    
    test_event = FileEvent(
        path=f"/test/event_{random.randint(1000, 9999)}.txt",
        action=random.choice(list(FileActionEnum)),
        fme=random.uniform(0.0, 8.0)
    )
    db.add(test_event)
    db.commit()
    db.refresh(test_event)
    await manager.broadcast_new_file_event(test_event, current_user.email)
    return test_event

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
