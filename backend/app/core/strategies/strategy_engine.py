import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from .base_strategy import BaseStrategy, Signal
from ..market_data.dhanhq_client import DhanHQWebSocketClient
from ...services.supabase_client import SupabaseClient

class StrategyEngine:
    """
    Multi-strategy orchestrator that manages all trading strategies
    """
    
    def __init__(self):
        self.strategies: Dict[str, BaseStrategy] = {}
        self.market_client: Optional[DhanHQWebSocketClient] = None
        self.supabase_client: Optional[SupabaseClient] = None
        self.is_running = False
        self.logger = logging.getLogger(__name__)
        
        # Market data storage
        self.latest_market_data = {}
        
        # Emergency stop flag
        self.emergency_stopped = False
    
    def initialize(self, market_client: DhanHQWebSocketClient, supabase_client: SupabaseClient):
        """Initialize the strategy engine with market data client and database client"""
        self.market_client = market_client
        self.supabase_client = supabase_client
        
        # Register market data callback
        self.market_client.register_callback('market_data', self._on_market_data)
        self.market_client.register_callback('index_data', self._on_index_data)
    
    def add_strategy(self, strategy: BaseStrategy):
        """Add a new strategy to the engine"""
        self.strategies[strategy.strategy_id] = strategy
        self.logger.info(f"Added strategy {strategy.strategy_id} ({strategy.name}) to engine")
    
    def remove_strategy(self, strategy_id: str):
        """Remove a strategy from the engine"""
        if strategy_id in self.strategies:
            strategy = self.strategies.pop(strategy_id)
            self.logger.info(f"Removed strategy {strategy_id} ({strategy.name}) from engine")
    
    def get_strategy(self, strategy_id: str) -> Optional[BaseStrategy]:
        """Get a strategy by ID"""
        return self.strategies.get(strategy_id)
    
    def get_active_strategies(self) -> List[BaseStrategy]:
        """Get all active strategies"""
        return [s for s in self.strategies.values() if s.is_simulation_active]
    
    def get_live_strategies(self) -> List[BaseStrategy]:
        """Get all live trading strategies"""
        return [s for s in self.strategies.values() if s.is_live_mode]
    
    async def start(self):
        """Start the strategy engine"""
        if self.is_running:
            self.logger.warning("Strategy engine is already running")
            return
        
        if not self.market_client or not self.supabase_client:
            raise ValueError("Strategy engine not properly initialized")
        
        self.is_running = True
        self.emergency_stopped = False
        
        self.logger.info("Starting strategy engine...")
        
        # Connect to market data
        await self.market_client.connect()
        await self.market_client.subscribe_nifty_banknifty_options()
        
        # Start background tasks
        asyncio.create_task(self._periodic_tasks())
        
        self.logger.info("Strategy engine started successfully")
    
    async def stop(self):
        """Stop the strategy engine"""
        if not self.is_running:
            return
        
        self.is_running = False
        self.logger.info("Stopping strategy engine...")
        
        if self.market_client:
            await self.market_client.disconnect()
        
        self.logger.info("Strategy engine stopped")
    
    async def emergency_stop(self, reason: str, triggered_by: str = "system"):
        """Emergency stop all strategies and live trading"""
        self.emergency_stopped = True
        self.logger.critical(f"EMERGENCY STOP triggered by {triggered_by}: {reason}")
        
        # Get all affected strategies
        affected_strategies = []
        live_strategies_stopped = 0
        
        # Disable live mode for all strategies
        for strategy in self.strategies.values():
            if strategy.is_live_mode:
                strategy.is_live_mode = False
                live_strategies_stopped += 1
            
            if strategy.is_simulation_active:
                strategy.is_simulation_active = False
            
            affected_strategies.append({
                "strategy_id": strategy.strategy_id,
                "name": strategy.name,
                "was_live": strategy.is_live_mode
            })
        
        # Log emergency stop to database
        if self.supabase_client:
            emergency_log = {
                "triggered_by": triggered_by,
                "reason": reason,
                "affected_strategies": affected_strategies,
                "total_strategies_stopped": live_strategies_stopped,
                "stopped_at": datetime.now().isoformat()
            }
            
            await self.supabase_client.create_emergency_stop_log(emergency_log)
        
        # Update strategies in database
        for strategy in self.strategies.values():
            if self.supabase_client:
                await self.supabase_client.update_strategy(strategy.strategy_id, {
                    "is_simulation_active": False,
                    "is_live_mode": False
                })
        
        self.logger.critical(f"Emergency stop completed. {live_strategies_stopped} live strategies stopped.")
    
    async def _on_market_data(self, market_data: Dict[str, Any]):
        """Handle incoming market data"""
        try:
            symbol = market_data.get("symbol", "")
            self.latest_market_data[symbol] = market_data
            
            # Store market data
            if self.supabase_client:
                # Store tick data
                await self._store_market_feed(market_data)
                
                # Update OHLCV data if available
                ohlcv = self.market_client.get_latest_ohlcv(symbol, "1min")
                if ohlcv:
                    await self._store_ohlcv_data(ohlcv)
            
            # Process market data through active strategies
            if not self.emergency_stopped:
                await self._process_strategies(market_data)
                
        except Exception as e:
            self.logger.error(f"Error processing market data: {e}")
    
    async def _on_index_data(self, index_data: Dict[str, Any]):
        """Handle incoming index data"""
        try:
            symbol = index_data.get("symbol", "")
            self.latest_market_data[symbol] = index_data
            
            # Store index data
            if self.supabase_client:
                await self._store_market_feed(index_data)
            
        except Exception as e:
            self.logger.error(f"Error processing index data: {e}")
    
    async def _process_strategies(self, market_data: Dict[str, Any]):
        """Process market data through all active strategies"""
        active_strategies = self.get_active_strategies()
        
        for strategy in active_strategies:
            try:
                # Analyze market data
                indicators = strategy.analyze_market_data(market_data)
                
                if not indicators:
                    continue
                
                # Update positions with current market data
                strategy.update_positions(market_data)
                
                # Generate signals
                signal = strategy.generate_signals(indicators)
                
                if signal:
                    await self._process_signal(strategy, signal)
                    
            except Exception as e:
                self.logger.error(f"Error processing strategy {strategy.strategy_id}: {e}")
    
    async def _process_signal(self, strategy: BaseStrategy, signal: Signal):
        """Process a trading signal"""
        try:
            # Store signal in database
            if self.supabase_client:
                signal_data = {
                    "strategy_id": signal.strategy_id,
                    "symbol": signal.symbol,
                    "signal_type": signal.signal_type.value,
                    "signal_strength": signal.signal_strength,
                    "price": signal.price,
                    "indicators": signal.indicators,
                    "executed": False,
                    "timestamp": signal.timestamp.isoformat()
                }
                
                signal_record = await self.supabase_client.create_signal(signal_data)
                
                if signal_record:
                    signal_id = signal_record["id"]
                else:
                    signal_id = None
            
            # Execute virtual trade
            virtual_position = strategy.execute_virtual_trade(signal)
            
            if virtual_position:
                # Store virtual trade in database
                if self.supabase_client:
                    trade_data = {
                        "strategy_id": signal.strategy_id,
                        "trade_mode": "VIRTUAL",
                        "symbol": virtual_position.symbol,
                        "trade_type": virtual_position.trade_type.value,
                        "entry_time": virtual_position.entry_time.isoformat(),
                        "entry_price": virtual_position.entry_price,
                        "quantity": virtual_position.quantity,
                        "stop_loss": virtual_position.stop_loss,
                        "target_price": virtual_position.target_price,
                        "status": virtual_position.status,
                        "entry_volume": signal.indicators.get("current_volume", 0),
                        "indicators": signal.indicators
                    }
                    
                    trade_record = await self.supabase_client.create_trade(trade_data)
                    
                    if trade_record and signal_id:
                        # Update signal as executed
                        await self.supabase_client.client.table("trading_signals").update({
                            "executed": True,
                            "execution_mode": "VIRTUAL",
                            "trade_id": trade_record["id"]
                        }).eq("id", signal_id).execute()
                
                self.logger.info(f"Virtual trade executed: {virtual_position.trade_type.value} {virtual_position.symbol} @ {virtual_position.entry_price}")
            
            # Execute live trade if live mode is enabled
            if strategy.is_live_mode:
                live_position = strategy.execute_live_trade(signal)
                
                if live_position:
                    # Store live trade in database
                    if self.supabase_client:
                        trade_data = {
                            "strategy_id": signal.strategy_id,
                            "trade_mode": "LIVE",
                            "symbol": live_position.symbol,
                            "trade_type": live_position.trade_type.value,
                            "entry_time": live_position.entry_time.isoformat(),
                            "entry_price": live_position.entry_price,
                            "quantity": live_position.quantity,
                            "stop_loss": live_position.stop_loss,
                            "target_price": live_position.target_price,
                            "status": live_position.status,
                            "dhanhq_order_id": getattr(live_position, 'dhanhq_order_id', None),
                            "entry_volume": signal.indicators.get("current_volume", 0),
                            "indicators": signal.indicators
                        }
                        
                        trade_record = await self.supabase_client.create_trade(trade_data)
                        
                        if trade_record and signal_id:
                            # Update signal as executed
                            await self.supabase_client.client.table("trading_signals").update({
                                "executed": True,
                                "execution_mode": "LIVE",
                                "trade_id": trade_record["id"]
                            }).eq("id", signal_id).execute()
                    
                    self.logger.info(f"Live trade executed: {live_position.trade_type.value} {live_position.symbol} @ {live_position.entry_price}")
                    
        except Exception as e:
            self.logger.error(f"Error processing signal: {e}")
    
    async def _store_market_feed(self, market_data: Dict[str, Any]):
        """Store market tick data"""
        try:
            feed_data = {
                "symbol": market_data.get("symbol", ""),
                "ltp": market_data.get("ltp", 0),
                "volume": market_data.get("volume", 0),
                "oi": market_data.get("oi", 0),
                "bid_price": market_data.get("bid", None),
                "ask_price": market_data.get("ask", None),
                "high": market_data.get("high", None),
                "low": market_data.get("low", None),
                "timestamp": market_data.get("timestamp", datetime.now()).isoformat()
            }
            
            # Store in database (consider batching for performance)
            # For now, we'll skip storing every tick to avoid overwhelming the database
            # In production, you might want to batch these or store selectively
            
        except Exception as e:
            self.logger.error(f"Error storing market feed: {e}")
    
    async def _store_ohlcv_data(self, ohlcv_data: Dict[str, Any]):
        """Store OHLCV data"""
        try:
            ohlcv_record = {
                "symbol": ohlcv_data.get("symbol", ""),
                "timeframe": ohlcv_data.get("timeframe", "1min"),
                "timestamp": ohlcv_data.get("timestamp", datetime.now()).isoformat(),
                "open_price": ohlcv_data.get("open", 0),
                "high_price": ohlcv_data.get("high", 0),
                "low_price": ohlcv_data.get("low", 0),
                "close_price": ohlcv_data.get("close", 0),
                "volume": ohlcv_data.get("volume", 0),
                "oi": ohlcv_data.get("oi", 0)
            }
            
            await self.supabase_client.store_ohlcv_data(ohlcv_record)
            
        except Exception as e:
            self.logger.error(f"Error storing OHLCV data: {e}")
    
    async def _periodic_tasks(self):
        """Run periodic maintenance tasks"""
        while self.is_running:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                if not self.emergency_stopped:
                    await self._check_eod_exit()
                    await self._update_performance_metrics()
                    
            except Exception as e:
                self.logger.error(f"Error in periodic tasks: {e}")
    
    async def _check_eod_exit(self):
        """Check for end-of-day exit conditions"""
        current_time = datetime.now()
        
        # EOD exit at 3:15 PM
        if current_time.hour == 15 and current_time.minute >= 15:
            for strategy in self.strategies.values():
                for position in strategy.virtual_positions:
                    if position.status == "OPEN":
                        # Close position
                        current_price = self.latest_market_data.get(position.symbol, {}).get("ltp", position.entry_price)
                        strategy._close_position(position, current_price, "EOD")
                        
                        # Update in database
                        if self.supabase_client:
                            await self.supabase_client.update_trade(position.id, {
                                "exit_time": position.exit_time.isoformat(),
                                "exit_price": position.exit_price,
                                "exit_reason": position.exit_reason,
                                "pnl": position.pnl,
                                "status": position.status
                            })
                        
                        self.logger.info(f"EOD exit: {position.symbol} @ {current_price}, P&L: {position.pnl}")
    
    async def _update_performance_metrics(self):
        """Update strategy performance metrics"""
        try:
            for strategy in self.strategies.values():
                performance = strategy.get_performance_summary()
                
                if self.supabase_client:
                    await self.supabase_client.update_strategy(strategy.strategy_id, {
                        "performance_metrics": performance
                    })
                    
        except Exception as e:
            self.logger.error(f"Error updating performance metrics: {e}")
    
    def get_engine_status(self) -> Dict[str, Any]:
        """Get current engine status"""
        return {
            "is_running": self.is_running,
            "emergency_stopped": self.emergency_stopped,
            "total_strategies": len(self.strategies),
            "active_strategies": len(self.get_active_strategies()),
            "live_strategies": len(self.get_live_strategies()),
            "market_connection": self.market_client.is_connected if self.market_client else False,
            "latest_market_symbols": list(self.latest_market_data.keys())
        }