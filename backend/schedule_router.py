from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import requests
import os
from middleware.auth_middleware import get_current_user_id

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

class ScheduleChangeRequest(BaseModel):
    event_id: Optional[str] = None
    change_type: str
    old_datetime: Optional[str] = None
    new_datetime: Optional[str] = None
    reason: str
    conflicting_event_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

def supabase_get(table: str, query: str = ""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    response = requests.get(url, headers=headers)
    if not response.ok:
        raise HTTPException(status_code=500, detail=response.text)
    return response.json()

def supabase_post(table: str, data: dict):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    response = requests.post(url, headers=headers, json=data)
    if not response.ok:
        raise HTTPException(status_code=500, detail=response.text)

@router.get("/changes")
async def get_schedule_changes(user_id: str = Depends(get_current_user_id)):
    try:
        changes = supabase_get("schedule_changes", f"user_id=eq.{user_id}&select=*&order=created_at.desc&limit=50")
        return {
            "success": True,
            "changes": changes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/changes")
async def log_schedule_change(req: ScheduleChangeRequest, user_id: str = Depends(get_current_user_id)):
    try:
        VALID_TYPES = ['conflict_resolved', 'rescheduled', 'auto_moved', 'user_moved', 'completed', 'skipped', 'cancelled']
        if req.change_type not in VALID_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid change_type. Must be one of: {', '.join(VALID_TYPES)}")
            
        data = {
            "user_id": user_id,
            "event_id": req.event_id,
            "change_type": req.change_type,
            "old_datetime": req.old_datetime,
            "new_datetime": req.new_datetime,
            "reason": req.reason,
            "conflicting_event_id": req.conflicting_event_id,
            "metadata": req.metadata or {}
        }
        
        supabase_post("schedule_changes", data)
        
        return {
            "success": True,
            "message": "Schedule change logged"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Exception in /changes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
