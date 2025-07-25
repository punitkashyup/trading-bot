from fastapi import APIRouter, HTTPException
from typing import List, Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_market_data():
    """Get current market data"""
    try:
        from app.services.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        result = supabase.client.table("market_data").select("*").order("timestamp", desc=True).limit(100).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching market data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market data")

@router.get("/instruments")
async def get_instruments():
    """Get available instruments"""
    try:
        from app.services.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        result = supabase.client.table("instruments").select("*").execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching instruments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch instruments")