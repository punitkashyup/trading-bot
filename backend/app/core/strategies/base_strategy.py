from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class TradeType(Enum):
    LONG = "LONG"
    SHORT = "SHORT"

class TradeMode(Enum):
    VIRTUAL = "VIRTUAL"
    LIVE = "LIVE"

@dataclass
class Position:
    id: str
    symbol: str
    trade_type: TradeType
    entry_time: datetime
    entry_price: float
    quantity: int
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = None
    exit_reason: Optional[str] = None
    pnl: Optional[float] = None
    status: str = "OPEN"

@dataclass
class Signal:
    strategy_id: str
    symbol: str
    signal_type: TradeType
    signal_strength: float
    price: float
    indicators: Dict[str, Any]
    timestamp: datetime

class BaseStrategy(ABC):
    def __init__(self, strategy_id: str, config: Dict[str, Any]):
        self.strategy_id = strategy_id
        self.config = config
        self.name = "Base Strategy"
        self.instruments = []
        
        # Strategy state
        self.is_simulation_active = False
        self.is_live_mode = False
        
        # Position tracking
        self.virtual_positions: List[Position] = []
        self.live_positions: List[Position] = []
        
        # Performance metrics
        self.virtual_pnl = 0.0
        self.live_pnl = 0.0
        self.virtual_trade_count = 0
        self.live_trade_count = 0
        self.win_rate = 0.0
        
        # Risk management
        self.max_position_size = config.get("max_position_size", 0.02)  # 2% of capital
        self.max_open_trades = config.get("max_open_trades", 3)
        self.max_daily_loss = config.get("max_daily_loss", 0.06)  # 6%
        self.min_risk_reward_ratio = config.get("min_risk_reward_ratio", 2.0)
        
        # Re-entry prevention
        self.last_trade_time = {}  # symbol -> timestamp
        self.reentry_cooldown = 30 * 60  # 30 minutes in seconds

    @abstractmethod
    def analyze_market_data(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze incoming market data and compute technical indicators
        
        Args:
            market_data: Real-time market data from DhanHQ
            
        Returns:
            Dict containing computed indicators
        """
        pass
    
    @abstractmethod
    def generate_signals(self, indicators: Dict[str, Any]) -> Optional[Signal]:
        """
        Generate trading signals based on technical indicators
        
        Args:
            indicators: Computed technical indicators
            
        Returns:
            Signal object if conditions are met, None otherwise
        """
        pass
    
    def can_enter_trade(self, symbol: str, trade_type: TradeType) -> bool:
        """
        Check if we can enter a new trade based on risk management rules
        """
        # Check maximum open trades
        open_positions = [p for p in self.virtual_positions if p.status == "OPEN"]
        if len(open_positions) >= self.max_open_trades:
            return False
        
        # Check re-entry cooldown
        if symbol in self.last_trade_time:
            time_since_last = datetime.now().timestamp() - self.last_trade_time[symbol]
            if time_since_last < self.reentry_cooldown:
                return False
        
        # Check daily loss limit
        if abs(self.virtual_pnl) >= self.max_daily_loss:
            return False
            
        return True
    
    def calculate_position_size(self, signal_strength: float, price: float) -> int:
        """
        Calculate position size based on signal strength and risk management
        """
        # Base position size as percentage of capital
        base_size = self.max_position_size
        
        # Adjust based on signal strength (from prompt requirements)
        if signal_strength > 250:  # VROC > 250%
            size_multiplier = 1.0
        elif 150 <= signal_strength <= 250:  # VROC 150-250%
            size_multiplier = 0.75
        else:  # VROC < 150%
            size_multiplier = 0.5
            
        # Calculate quantity (simplified - would need actual capital amount)
        # For now, using fixed capital of 100000
        capital = 100000
        position_value = capital * base_size * size_multiplier
        quantity = int(position_value / price)
        
        return max(1, quantity)  # Minimum 1 quantity
    
    def execute_virtual_trade(self, signal: Signal) -> Optional[Position]:
        """
        Execute a virtual trade based on the signal
        """
        if not self.can_enter_trade(signal.symbol, signal.signal_type):
            return None
            
        quantity = self.calculate_position_size(signal.signal_strength, signal.price)
        
        # Create position
        position = Position(
            id=f"virtual_{signal.strategy_id}_{datetime.now().timestamp()}",
            symbol=signal.symbol,
            trade_type=signal.signal_type,
            entry_time=signal.timestamp,
            entry_price=signal.price,
            quantity=quantity
        )
        
        # Set stop loss and target based on ATR (simplified)
        atr = signal.indicators.get("atr", signal.price * 0.02)  # 2% default
        
        if signal.signal_type == TradeType.LONG:
            position.stop_loss = signal.price - (1.5 * atr)
            position.target_price = signal.price + (2 * atr)
        else:
            position.stop_loss = signal.price + (1.5 * atr)
            position.target_price = signal.price - (2 * atr)
            
        self.virtual_positions.append(position)
        self.last_trade_time[signal.symbol] = signal.timestamp.timestamp()
        
        return position
    
    def execute_live_trade(self, signal: Signal) -> Optional[Position]:
        """
        Execute a live trade via DhanHQ API (only if live mode enabled)
        """
        if not self.is_live_mode:
            return None
            
        # This would integrate with DhanHQ order placement
        # For now, returning None - will be implemented in order_manager.py
        return None
    
    def update_positions(self, market_data: Dict[str, Any]):
        """
        Update open positions with current market data
        """
        current_price = market_data.get("ltp", 0)
        symbol = market_data.get("symbol", "")
        
        # Update virtual positions
        for position in self.virtual_positions:
            if position.symbol == symbol and position.status == "OPEN":
                self._check_exit_conditions(position, current_price, market_data)
    
    def _check_exit_conditions(self, position: Position, current_price: float, market_data: Dict[str, Any]):
        """
        Check if position should be closed based on exit conditions
        """
        should_exit = False
        exit_reason = None
        
        # Price-based exits
        if position.trade_type == TradeType.LONG:
            if current_price >= position.target_price:
                should_exit = True
                exit_reason = "TARGET"
            elif current_price <= position.stop_loss:
                should_exit = True
                exit_reason = "STOP_LOSS"
        else:
            if current_price <= position.target_price:
                should_exit = True
                exit_reason = "TARGET"
            elif current_price >= position.stop_loss:
                should_exit = True
                exit_reason = "STOP_LOSS"
        
        # Volume-based exit (from prompt requirements)
        volume = market_data.get("volume", 0)
        avg_volume = market_data.get("avg_volume", volume)
        if volume < 0.5 * avg_volume:  # Volume < 50% of average for 3 bars
            should_exit = True
            exit_reason = "LOW_VOLUME"
        
        # Time-based exit (EOD at 3:15 PM)
        current_time = datetime.now()
        if current_time.hour >= 15 and current_time.minute >= 15:
            should_exit = True
            exit_reason = "EOD"
        
        if should_exit:
            self._close_position(position, current_price, exit_reason)
    
    def _close_position(self, position: Position, exit_price: float, exit_reason: str):
        """
        Close a position and calculate P&L
        """
        position.exit_time = datetime.now()
        position.exit_price = exit_price
        position.exit_reason = exit_reason
        position.status = "CLOSED"
        
        # Calculate P&L
        if position.trade_type == TradeType.LONG:
            pnl = (exit_price - position.entry_price) * position.quantity
        else:
            pnl = (position.entry_price - exit_price) * position.quantity
            
        position.pnl = pnl
        self.virtual_pnl += pnl
        self.virtual_trade_count += 1
        
        # Update win rate
        winning_trades = sum(1 for p in self.virtual_positions if p.status == "CLOSED" and p.pnl > 0)
        self.win_rate = winning_trades / self.virtual_trade_count if self.virtual_trade_count > 0 else 0
    
    def validate_for_live_mode(self) -> Dict[str, Any]:
        """
        Validate strategy performance before enabling live mode
        
        Returns:
            Dict with validation results
        """
        validation_results = {
            "passed": True,
            "criteria": {
                "positive_pnl": self.virtual_pnl > 0,
                "min_trades": self.virtual_trade_count >= 10,
                "min_win_rate": self.win_rate >= 0.5
            },
            "metrics": {
                "virtual_pnl": self.virtual_pnl,
                "trade_count": self.virtual_trade_count,
                "win_rate": self.win_rate
            }
        }
        
        validation_results["passed"] = all(validation_results["criteria"].values())
        
        return validation_results
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get current performance summary
        """
        return {
            "strategy_id": self.strategy_id,
            "name": self.name,
            "is_simulation_active": self.is_simulation_active,
            "is_live_mode": self.is_live_mode,
            "virtual_pnl": self.virtual_pnl,
            "live_pnl": self.live_pnl,
            "virtual_trades": self.virtual_trade_count,
            "live_trades": self.live_trade_count,
            "win_rate": self.win_rate,
            "open_positions": len([p for p in self.virtual_positions if p.status == "OPEN"])
        }