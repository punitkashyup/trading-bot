from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from app.services.supabase_client import SupabaseClient
from app.core.strategies.strategy_engine import StrategyEngine

router = APIRouter()

# Pydantic models for API requests/responses
class StrategyUpdate(BaseModel):
    config: Optional[Dict[str, Any]] = None
    is_simulation_active: Optional[bool] = None

class StrategyResponse(BaseModel):
    id: str
    name: str
    strategy_type: str
    is_simulation_active: bool
    is_live_mode: bool
    live_mode_enabled_at: Optional[datetime]
    config: Dict[str, Any]
    performance_metrics: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

# Dependency to get Supabase client
def get_supabase_client():
    return SupabaseClient()

# Dependency to get Strategy Engine
def get_strategy_engine():
    return StrategyEngine()

@router.get("/", response_model=List[StrategyResponse])
async def list_strategies(
    supabase: SupabaseClient = Depends(get_supabase_client)
):
    """
    List all available strategies
    """
    try:
        result = supabase.client.table("strategies").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategies: {str(e)}")

@router.post("/toggle/{strategy_id}")
async def toggle_strategy_simulation(
    strategy_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client),
    strategy_engine: StrategyEngine = Depends(get_strategy_engine)
):
    """
    Enable/disable strategy simulation
    """
    try:
        # Get current strategy state
        result = supabase.client.table("strategies").select("*").eq("id", strategy_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy = result.data[0]
        new_state = not strategy["is_simulation_active"]
        
        # Update database
        update_result = supabase.client.table("strategies").update({
            "is_simulation_active": new_state,
            "updated_at": datetime.now().isoformat()
        }).eq("id", strategy_id).execute()
        
        # Update strategy engine
        if strategy_id in strategy_engine.strategies:
            strategy_engine.strategies[strategy_id].is_simulation_active = new_state
        
        return {"success": True, "is_simulation_active": new_state}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle strategy: {str(e)}")

@router.post("/live-mode/{strategy_id}")
async def toggle_live_mode(
    strategy_id: str,
    enable: bool,
    supabase: SupabaseClient = Depends(get_supabase_client),
    strategy_engine: StrategyEngine = Depends(get_strategy_engine)
):
    """
    Toggle live mode for specific strategy
    """
    try:
        # Get strategy
        result = supabase.client.table("strategies").select("*").eq("id", strategy_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy = result.data[0]
        
        if enable:
            # Validate strategy for live mode
            if strategy_id not in strategy_engine.strategies:
                raise HTTPException(status_code=400, detail="Strategy not found in engine")
            
            strategy_instance = strategy_engine.strategies[strategy_id]
            validation_result = strategy_instance.validate_for_live_mode()
            
            if not validation_result["passed"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Strategy validation failed: {validation_result}"
                )
            
            # Log validation to database
            validation_log = {
                "strategy_id": strategy_id,
                "validation_status": "PASSED",
                "validation_criteria": validation_result["criteria"],
                "validation_results": validation_result["metrics"],
                "validated_at": datetime.now().isoformat()
            }
            
            supabase.client.table("live_mode_validations").insert(validation_log).execute()
            
            # Enable live mode
            update_data = {
                "is_live_mode": True,
                "live_mode_enabled_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        else:
            # Disable live mode
            update_data = {
                "is_live_mode": False,
                "live_mode_enabled_at": None,
                "updated_at": datetime.now().isoformat()
            }
        
        # Update database
        update_result = supabase.client.table("strategies").update(update_data).eq("id", strategy_id).execute()
        
        # Update strategy engine
        if strategy_id in strategy_engine.strategies:
            strategy_engine.strategies[strategy_id].is_live_mode = enable
        
        return {"success": True, "is_live_mode": enable}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle live mode: {str(e)}")

@router.get("/summary")
async def get_strategies_summary(
    supabase: SupabaseClient = Depends(get_supabase_client),
    strategy_engine: StrategyEngine = Depends(get_strategy_engine)
):
    """
    Get today's summary for all strategies
    """
    try:
        strategies_summary = []
        
        # Get all strategies from database
        result = supabase.client.table("strategies").select("*").execute()
        
        for strategy_record in result.data:
            strategy_id = strategy_record["id"]
            
            # Get performance from strategy engine if available
            if strategy_id in strategy_engine.strategies:
                strategy_instance = strategy_engine.strategies[strategy_id]
                performance = strategy_instance.get_performance_summary()
            else:
                performance = {
                    "strategy_id": strategy_id,
                    "name": strategy_record["name"],
                    "is_simulation_active": strategy_record["is_simulation_active"],
                    "is_live_mode": strategy_record["is_live_mode"],
                    "virtual_pnl": 0.0,
                    "live_pnl": 0.0,
                    "virtual_trades": 0,
                    "live_trades": 0,
                    "win_rate": 0.0,
                    "open_positions": 0
                }
            
            strategies_summary.append(performance)
        
        return {"strategies": strategies_summary}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get strategies summary: {str(e)}")

@router.get("/{strategy_id}/performance")
async def get_strategy_performance(
    strategy_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client),
    strategy_engine: StrategyEngine = Depends(get_strategy_engine)
):
    """
    Get detailed performance for specific strategy
    """
    try:
        # Check if strategy exists
        result = supabase.client.table("strategies").select("*").eq("id", strategy_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy_record = result.data[0]
        
        # Get performance data
        performance_result = supabase.client.table("strategy_performance")\
            .select("*")\
            .eq("strategy_id", strategy_id)\
            .order("date", desc=True)\
            .limit(30)\
            .execute()
        
        # Get recent trades
        trades_result = supabase.client.table("trades")\
            .select("*")\
            .eq("strategy_id", strategy_id)\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()
        
        # Get current performance from strategy engine
        current_performance = {}
        if strategy_id in strategy_engine.strategies:
            strategy_instance = strategy_engine.strategies[strategy_id]
            current_performance = strategy_instance.get_performance_summary()
        
        return {
            "strategy": strategy_record,
            "current_performance": current_performance,
            "historical_performance": performance_result.data,
            "recent_trades": trades_result.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get strategy performance: {str(e)}")

@router.put("/config/{strategy_id}")
async def update_strategy_config(
    strategy_id: str,
    update_data: StrategyUpdate,
    supabase: SupabaseClient = Depends(get_supabase_client),
    strategy_engine: StrategyEngine = Depends(get_strategy_engine)
):
    """
    Update strategy parameters
    """
    try:
        # Check if strategy exists
        result = supabase.client.table("strategies").select("*").eq("id", strategy_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        # Prepare update data
        update_fields = {"updated_at": datetime.now().isoformat()}
        
        if update_data.config is not None:
            update_fields["config"] = update_data.config
        
        if update_data.is_simulation_active is not None:
            update_fields["is_simulation_active"] = update_data.is_simulation_active
        
        # Update database
        update_result = supabase.client.table("strategies").update(update_fields).eq("id", strategy_id).execute()
        
        # Update strategy engine if strategy is loaded
        if strategy_id in strategy_engine.strategies:
            strategy_instance = strategy_engine.strategies[strategy_id]
            
            if update_data.config:
                strategy_instance.config.update(update_data.config)
            
            if update_data.is_simulation_active is not None:
                strategy_instance.is_simulation_active = update_data.is_simulation_active
        
        return {"success": True, "updated_strategy": update_result.data[0]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update strategy: {str(e)}")

@router.delete("/{strategy_id}")
async def delete_strategy(
    strategy_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client),
    strategy_engine: StrategyEngine = Depends(get_strategy_engine)
):
    """
    Delete a strategy
    """
    try:
        # Check if strategy exists
        result = supabase.client.table("strategies").select("*").eq("id", strategy_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy = result.data[0]
        
        # Don't allow deletion if live mode is active
        if strategy["is_live_mode"]:
            raise HTTPException(status_code=400, detail="Cannot delete strategy with active live mode")
        
        # Remove from strategy engine
        if strategy_id in strategy_engine.strategies:
            strategy_engine.remove_strategy(strategy_id)
        
        # Delete from database
        delete_result = supabase.client.table("strategies").delete().eq("id", strategy_id).execute()
        
        return {"success": True, "message": "Strategy deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete strategy: {str(e)}")