import json
import asyncio
from typing import List, Dict
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime
from enum import Enum

from .database import SessionLocal
from .models import Alert, FileEvent
from .schemas import AlertResponse, FileEventResponse

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_email: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_email not in self.user_connections:
            self.user_connections[user_email] = []
        self.user_connections[user_email].append(websocket)
        print(f"WebSocket connected for user: {user_email}")
    
    def disconnect(self, websocket: WebSocket, user_email: str):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_email in self.user_connections:
            if websocket in self.user_connections[user_email]:
                self.user_connections[user_email].remove(websocket)
            if not self.user_connections[user_email]:
                del self.user_connections[user_email]
        print(f"WebSocket disconnected for user: {user_email}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending personal message: {e}")
    
    async def broadcast_to_user(self, message: dict, user_email: str):
        """Broadcast message to all connections for a specific user"""
        if user_email in self.user_connections:
            disconnected = []
            for connection in self.user_connections[user_email]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Error broadcasting to user {user_email}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, user_email)
    
    async def broadcast_new_alert(self, alert: AlertResponse, user_email: str):
        """Broadcast new alert to user"""
        def _enum_val(v):
            return v.value if isinstance(v, Enum) else v
        message = {
            "type": "new_alert",
            "data": {
                "id": alert.id,
                "host": alert.host,
                "path": alert.path,
                "severity": _enum_val(alert.severity),
                "fme": alert.fme,
                "abt": alert.abt,
                "type": _enum_val(alert.type),
                "created_at": alert.created_at.isoformat()
            }
        }
        await self.broadcast_to_user(message, user_email)
    
    async def broadcast_new_file_event(self, event: FileEventResponse, user_email: str):
        """Broadcast new file event to user"""
        def _enum_val(v):
            return v.value if isinstance(v, Enum) else v
        message = {
            "type": "new_file_event",
            "data": {
                "id": event.id,
                "path": event.path,
                "action": _enum_val(event.action),
                "fme": event.fme,
                "created_at": event.created_at.isoformat()
            }
        }
        await self.broadcast_to_user(message, user_email)
    
    async def broadcast_metrics_update(self, metrics: dict, user_email: str):
        """Broadcast metrics update to user"""
        message = {
            "type": "metrics_update",
            "data": metrics
        }
        await self.broadcast_to_user(message, user_email)

# Global connection manager
manager = ConnectionManager()
