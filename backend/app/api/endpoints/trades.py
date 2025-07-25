from fastapi import APIRouter, HTTPException
from typing import List, Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_trades():
    """Get all trades"""
    try:
        from app.services.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        result = supabase.client.table("trades").select("*").order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch trades")

@router.get("/{trade_id}")
async def get_trade(trade_id: str):
    """Get specific trade by ID"""
    try:
        from app.services.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        result = supabase.client.table("trades").select("*").eq("id", trade_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Trade not found")
        return result.data[0]
    except Exception as e:
        logger.error(f"Error fetching trade {trade_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trade {trade_id}")