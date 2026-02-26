import json
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Allow multiple websocket connections per user session/task
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_log(self, message: str, level: str = "info"):
        """Send a standard log message to all connected clients"""
        payload = {
            "type": "log",
            "level": level,    # info, success, warning, error
            "message": message
        }
        await self.broadcast(payload)
        
    async def send_stats(self, stats: dict):
        """Send statistical updates to all connected clients"""
        payload = {
            "type": "stats",
            "data": stats
        }
        await self.broadcast(payload)
        
    async def send_status(self, status: str):
         """Send scraper status to all connected clients"""
         payload = {
             "type": "status",
             "status": status # idle, running, completed, error
         }
         await self.broadcast(payload)

    async def broadcast(self, payload: dict):
        message = json.dumps(payload)
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Handle disconnected clients that weren't caught
                pass

# Global manager instance
manager = ConnectionManager()
