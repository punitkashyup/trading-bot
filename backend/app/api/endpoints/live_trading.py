from fastapi import APIRouter, HTTPException
from typing import List, Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/status")
async def get_live_trading_status():
    """Get live trading system status"""
    try:
        from app.services.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        
        # Get system status from database
        status_result = supabase.client.table("system_status").select("*").order("updated_at", desc=True).limit(1).execute()
        
        if status_result.data:
            return status_result.data[0]
        else:
            raise HTTPException(status_code=404, detail="System status not found")
    except Exception as e:
        logger.error(f"Error fetching live trading status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch live trading status")

