from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.api.ws import manager
from backend.api.routers.auth import get_current_active_user, get_db
from backend.alchemy.models import User
from backend.modules.flipkart.main import FlipkartScraper

router = APIRouter(tags=["Scraper"])

class ScraperRequest(BaseModel):
    query: str
    max_pages: int = 1

active_scraper = None

def run_scraper_task(query: str, max_pages: int):
    global active_scraper
    scraper = FlipkartScraper()
    scraper.MAX_PAGES = max_pages
    active_scraper = scraper
    try:
        scraper.run(query)
    finally:
        active_scraper = None

@router.post("/start")
async def start_scraper(
    payload: ScraperRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    if payload.max_pages < 1 or payload.max_pages > 50:
         raise HTTPException(status_code=400, detail="max_pages must be between 1 and 50")
    
    if not payload.query or len(payload.query.strip()) == 0:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    background_tasks.add_task(run_scraper_task, payload.query, payload.max_pages)
    
    return {"message": f"Scraping started for '{payload.query}' up to {payload.max_pages} pages.", "status": "running"}

@router.post("/stop")
async def stop_scraper(
    current_user: User = Depends(get_current_active_user)
):
    global active_scraper
    if active_scraper:
        active_scraper.is_cancelled = True
        return {"message": "Stop requested correctly. Scraper halting...", "status": "stopping"}
    
    return {"message": "No active scraper.", "status": "stopped"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from the client in this one-way log stream
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
