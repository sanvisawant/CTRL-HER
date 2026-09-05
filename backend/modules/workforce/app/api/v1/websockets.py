from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio

router = APIRouter(tags=["Realtime WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket):
    """
    Real-time WebSocket feed for live dashboard updates:
    - Pushes live notifications when officers complete quests
    - Pushes real-time skill heatmap updates
    - Pushes live XP and level-up events
    """
    await manager.connect(websocket)
    try:
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to StatSaksham AI Realtime Intelligence Stream",
            "timestamp": "now"
        }))
        while True:
            # Keep socket alive and listen for client pings/subscriptions
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({
                "type": "PONG",
                "received": data
            }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
