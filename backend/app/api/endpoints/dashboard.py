from fastapi import APIRouter, HTTPException
from typing import List, Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_dashboard_data():
    """Get dashboard data including total P&L, trades, etc."""
    try:
        from app.services.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        
        # Get strategies
        strategies_result = supabase.client.table("strategies").select("*").execute()
        strategies = strategies_result.data
        
        # Get trades
        trades_result = supabase.client.table("trades").select("*").execute()
        trades = trades_result.data
        
        # Calculate metrics
        total_pnl = sum(trade.get("pnl", 0) for trade in trades if trade.get("pnl"))
        total_trades = len(trades)
        active_strategies = len([s for s in strategies if s.get("is_simulation_active")])
        live_strategies = len([s for s in strategies if s.get("is_live_mode")])
        
        # Get daily P&L (simplified)
        daily_pnl = []
        
        return {
            "total_pnl": total_pnl,
            "total_trades": total_trades,
            "active_strategies": active_strategies,
            "live_strategies": live_strategies,
            "daily_pnl": daily_pnl
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard data")