import os
from supabase import create_client, Client
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

class SupabaseClient:
    """
    Supabase client for database operations
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
        
        self.client: Client = create_client(self.url, self.key)
        self.logger = logging.getLogger(__name__)
    
    # Strategy operations
    async def create_strategy(self, strategy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new strategy"""
        try:
            result = self.client.table("strategies").insert(strategy_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error creating strategy: {e}")
            raise
    
    async def get_strategies(self) -> List[Dict[str, Any]]:
        """Get all strategies"""
        try:
            result = self.client.table("strategies").select("*").execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Error fetching strategies: {e}")
            raise
    
    async def get_strategy(self, strategy_id: str) -> Optional[Dict[str, Any]]:
        """Get strategy by ID"""
        try:
            result = self.client.table("strategies").select("*").eq("id", strategy_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error fetching strategy {strategy_id}: {e}")
            raise
    
    async def update_strategy(self, strategy_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update strategy"""
        try:
            update_data["updated_at"] = datetime.now().isoformat()
            result = self.client.table("strategies").update(update_data).eq("id", strategy_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error updating strategy {strategy_id}: {e}")
            raise
    
    async def delete_strategy(self, strategy_id: str) -> bool:
        """Delete strategy"""
        try:
            result = self.client.table("strategies").delete().eq("id", strategy_id).execute()
            return len(result.data) > 0
        except Exception as e:
            self.logger.error(f"Error deleting strategy {strategy_id}: {e}")
            raise
    
    # Trade operations
    async def create_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new trade"""
        try:
            result = self.client.table("trades").insert(trade_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error creating trade: {e}")
            raise
    
    async def get_trades(self, strategy_id: Optional[str] = None, trade_mode: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get trades with optional filtering"""
        try:
            query = self.client.table("trades").select("*")
            
            if strategy_id:
                query = query.eq("strategy_id", strategy_id)
            
            if trade_mode:
                query = query.eq("trade_mode", trade_mode)
            
            result = query.order("created_at", desc=True).limit(limit).execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Error fetching trades: {e}")
            raise
    
    async def update_trade(self, trade_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update trade"""
        try:
            result = self.client.table("trades").update(update_data).eq("id", trade_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error updating trade {trade_id}: {e}")
            raise
    
    # Signal operations
    async def create_signal(self, signal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new trading signal"""
        try:
            result = self.client.table("trading_signals").insert(signal_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error creating signal: {e}")
            raise
    
    async def get_signals(self, strategy_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get trading signals"""
        try:
            query = self.client.table("trading_signals").select("*")
            
            if strategy_id:
                query = query.eq("strategy_id", strategy_id)
            
            result = query.order("timestamp", desc=True).limit(limit).execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Error fetching signals: {e}")
            raise
    
    # Performance tracking
    async def create_performance_record(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create strategy performance record"""
        try:
            result = self.client.table("strategy_performance").insert(performance_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error creating performance record: {e}")
            raise
    
    async def get_performance_data(self, strategy_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get strategy performance data"""
        try:
            result = self.client.table("strategy_performance")\
                .select("*")\
                .eq("strategy_id", strategy_id)\
                .order("date", desc=True)\
                .limit(days)\
                .execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Error fetching performance data: {e}")
            raise
    
    # Live mode validation
    async def create_validation_log(self, validation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create live mode validation log"""
        try:
            result = self.client.table("live_mode_validations").insert(validation_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error creating validation log: {e}")
            raise
    
    # Emergency stop
    async def create_emergency_stop_log(self, stop_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create emergency stop log"""
        try:
            result = self.client.table("emergency_stops").insert(stop_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error creating emergency stop log: {e}")
            raise
    
    # OHLCV data operations
    async def store_ohlcv_data(self, ohlcv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Store OHLCV data"""
        try:
            # Use upsert to handle duplicates
            result = self.client.table("ohlcv_data").upsert(ohlcv_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            self.logger.error(f"Error storing OHLCV data: {e}")
            raise
    
    async def get_ohlcv_data(self, symbol: str, timeframe: str, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get OHLCV data"""
        try:
            result = self.client.table("ohlcv_data")\
                .select("*")\
                .eq("symbol", symbol)\
                .eq("timeframe", timeframe)\
                .order("timestamp", desc=True)\
                .limit(limit)\
                .execute()
            return result.data
        except Exception as e:
            self.logger.error(f"Error fetching OHLCV data: {e}")
            raise
    
    # Real-time subscriptions
    def subscribe_to_trades(self, callback):
        """Subscribe to real-time trade updates"""
        try:
            channel = self.client.channel('trades')
            channel.on(
                'postgres_changes',
                {
                    'event': '*',
                    'schema': 'public',
                    'table': 'trades'
                },
                callback
            )
            channel.subscribe()
            return channel
        except Exception as e:
            self.logger.error(f"Error subscribing to trades: {e}")
            raise
    
    def subscribe_to_signals(self, callback):
        """Subscribe to real-time signal updates"""
        try:
            channel = self.client.channel('signals')
            channel.on(
                'postgres_changes',
                {
                    'event': '*',
                    'schema': 'public',
                    'table': 'trading_signals'
                },
                callback
            )
            channel.subscribe()
            return channel
        except Exception as e:
            self.logger.error(f"Error subscribing to signals: {e}")
            raise
            
    def subscribe_to_strategies(self, callback):
        """Subscribe to real-time strategy updates"""
        try:
            channel = self.client.channel('strategies')
            channel.on(
                'postgres_changes',
                {
                    'event': '*',
                    'schema': 'public',
                    'table': 'strategies'
                },
                callback
            )
            channel.subscribe()
            return channel
        except Exception as e:
            self.logger.error(f"Error subscribing to strategies: {e}")
            raise
    
    # Dashboard data
    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get dashboard summary data"""
        try:
            # Get total P&L from all strategies
            strategies_result = self.client.table("strategies").select("*").execute()
            strategies = strategies_result.data
            
            total_virtual_pnl = 0
            total_live_pnl = 0
            active_strategies = 0
            live_strategies = 0
            
            for strategy in strategies:
                metrics = strategy.get("performance_metrics", {})
                total_virtual_pnl += metrics.get("virtual_pnl", 0)
                total_live_pnl += metrics.get("live_pnl", 0)
                
                if strategy.get("is_simulation_active"):
                    active_strategies += 1
                if strategy.get("is_live_mode"):
                    live_strategies += 1
            
            # Get recent trades count
            trades_result = self.client.table("trades").select("id", count="exact").execute()
            total_trades = trades_result.count or 0
            
            # Get recent performance data for chart
            performance_result = self.client.table("strategy_performance")\
                .select("date, virtual_pnl, live_pnl")\
                .order("date", desc=True)\
                .limit(30)\
                .execute()
            
            return {
                "total_pnl": total_virtual_pnl + total_live_pnl,
                "virtual_pnl": total_virtual_pnl,
                "live_pnl": total_live_pnl,
                "total_trades": total_trades,
                "active_strategies": active_strategies,
                "live_strategies": live_strategies,
                "pnl_history": performance_result.data
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching dashboard summary: {e}")
            raise