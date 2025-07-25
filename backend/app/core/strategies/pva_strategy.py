import ta
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from .base_strategy import BaseStrategy, Signal, TradeType

class PVAStrategy(BaseStrategy):
    """
    Price Volume Action Strategy with exact specifications from prompt
    """
    
    def __init__(self, strategy_id: str, config: Dict[str, Any]):
        super().__init__(strategy_id, config)
        self.name = "Price Volume Action Strategy"
        self.instruments = ["Nifty50", "BankNifty"]
        
        # PVA-specific parameters
        self.timeframes = ["1min", "5min", "15min", "daily"]
        
        # Historical data storage for indicators
        self.price_data = {tf: {"high": [], "low": [], "close": [], "volume": [], "timestamps": []} 
                          for tf in self.timeframes}
        
        # Volume Profile parameters
        self.volume_profile_window = 30  # 30-day window
        self.volume_profile_levels = 20  # Number of price levels
        
        # Indicator periods
        self.obv_period = 20
        self.vroc_period = 14
        self.vwap_period = 20
        self.avg_volume_short = 20
        self.avg_volume_long = 50
        
        # Entry/Exit thresholds
        self.volume_breakout_threshold = 1.5  # 150% of average
        self.vroc_breakout_threshold = 2.0    # 200%
        self.volume_climax_threshold = 3.0    # 300%
        self.atr_multiplier = 2.0
        
    def analyze_market_data(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze market data and compute PVA technical indicators
        """
        symbol = market_data.get("symbol", "")
        timeframe = market_data.get("timeframe", "1min")
        
        # Update price data
        self._update_price_data(market_data, timeframe)
        
        # Get data arrays for calculations
        data = self.price_data[timeframe]
        if len(data["close"]) < max(self.avg_volume_long, self.vwap_period):
            return {}  # Not enough data
        
        # Convert to numpy arrays
        high = np.array(data["high"][-100:])  # Last 100 bars
        low = np.array(data["low"][-100:])
        close = np.array(data["close"][-100:])
        volume = np.array(data["volume"][-100:])
        
        indicators = {}
        
        # 1. On-Balance Volume (OBV)
        indicators["obv"] = self._calculate_obv(close, volume)
        indicators["obv_ma"] = ta.trend.sma_indicator(indicators["obv"], window=self.obv_period)
        
        # 2. Volume Rate of Change (VROC)
        indicators["vroc"] = self._calculate_vroc(volume)
        
        # 3. Accumulation/Distribution Line
        indicators["ad_line"] = ta.volume.acc_dist_index_indicator(high, low, close, volume)
        
        # 4. Volume Weighted Average Price (VWAP)
        indicators["vwap"] = self._calculate_vwap(high, low, close, volume)
        
        # 5. Volume Profile and Point of Control (POC)
        vp_data = self._calculate_volume_profile(high, low, close, volume)
        indicators.update(vp_data)
        
        # 6. Average Volume
        indicators["avg_volume_20"] = ta.trend.sma_indicator(volume, window=self.avg_volume_short)
        indicators["avg_volume_50"] = ta.trend.sma_indicator(volume, window=self.avg_volume_long)
        
        # 7. Average True Range for stop loss calculations
        indicators["atr"] = ta.volatility.average_true_range(high, low, close, window=14)
        
        # 8. Price-based indicators for confirmation
        indicators["resistance"] = self._calculate_resistance(high, close)
        indicators["support"] = self._calculate_support(low, close)
        
        # Current market conditions
        current_price = close[-1] if len(close) > 0 else 0
        current_volume = volume[-1] if len(volume) > 0 else 0
        
        indicators["current_price"] = current_price
        indicators["current_volume"] = current_volume
        
        return indicators
    
    def generate_signals(self, indicators: Dict[str, Any]) -> Optional[Signal]:
        """
        Generate PVA trading signals based on exact criteria from prompt
        """
        if not indicators or len(indicators) == 0:
            return None
            
        current_price = indicators.get("current_price", 0)
        current_volume = indicators.get("current_volume", 0)
        
        if current_price == 0 or current_volume == 0:
            return None
        
        # Get latest indicator values
        obv = indicators.get("obv", np.array([]))
        vroc = indicators.get("vroc", np.array([]))
        vwap = indicators.get("vwap", np.array([]))
        avg_vol_20 = indicators.get("avg_volume_20", np.array([]))
        poc = indicators.get("poc", current_price)
        resistance = indicators.get("resistance", current_price * 1.01)
        support = indicators.get("support", current_price * 0.99)
        
        if len(obv) == 0 or len(vroc) == 0 or len(vwap) == 0 or len(avg_vol_20) == 0:
            return None
        
        # Current values
        current_obv = obv[-1] if len(obv) > 0 else 0
        current_vroc = vroc[-1] if len(vroc) > 0 else 0
        current_vwap = vwap[-1] if len(vwap) > 0 else current_price
        current_avg_vol = avg_vol_20[-1] if len(avg_vol_20) > 0 else current_volume
        
        # LONG Signal Conditions (from prompt)
        long_conditions = self._check_long_conditions(
            current_price, current_volume, current_obv, current_vroc,
            current_vwap, current_avg_vol, resistance, poc, obv
        )
        
        # SHORT Signal Conditions (from prompt)
        short_conditions = self._check_short_conditions(
            current_price, current_volume, current_obv, current_vroc,
            current_vwap, current_avg_vol, support, poc, obv
        )
        
        # Generate signal
        if long_conditions["all_met"]:
            return Signal(
                strategy_id=self.strategy_id,
                symbol=self.instruments[0],  # Default to first instrument
                signal_type=TradeType.LONG,
                signal_strength=current_vroc,
                price=current_price,
                indicators=indicators,
                timestamp=datetime.now()
            )
        elif short_conditions["all_met"]:
            return Signal(
                strategy_id=self.strategy_id,
                symbol=self.instruments[0],
                signal_type=TradeType.SHORT,
                signal_strength=current_vroc,
                price=current_price,
                indicators=indicators,
                timestamp=datetime.now()
            )
        
        return None
    
    def _update_price_data(self, market_data: Dict[str, Any], timeframe: str):
        """Update internal price data storage"""
        if timeframe not in self.price_data:
            return
            
        data = self.price_data[timeframe]
        
        # Add new data point
        data["high"].append(market_data.get("high", 0))
        data["low"].append(market_data.get("low", 0))
        data["close"].append(market_data.get("ltp", 0))
        data["volume"].append(market_data.get("volume", 0))
        data["timestamps"].append(datetime.now())
        
        # Keep only last 1000 data points
        max_length = 1000
        if len(data["close"]) > max_length:
            for key in data:
                data[key] = data[key][-max_length:]
    
    def _calculate_obv(self, close: np.ndarray, volume: np.ndarray) -> np.ndarray:
        """Calculate On-Balance Volume"""
        return ta.volume.on_balance_volume(close, volume)
    
    def _calculate_vroc(self, volume: np.ndarray) -> np.ndarray:
        """Calculate Volume Rate of Change"""
        return ta.momentum.roc(volume, window=self.vroc_period) * 100
    
    def _calculate_vwap(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, volume: np.ndarray) -> np.ndarray:
        """Calculate Volume Weighted Average Price"""
        typical_price = (high + low + close) / 3
        vwap = np.cumsum(typical_price * volume) / np.cumsum(volume)
        return vwap
    
    def _calculate_volume_profile(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, volume: np.ndarray) -> Dict[str, Any]:
        """Calculate Volume Profile, POC, and Value Area"""
        if len(close) < self.volume_profile_window:
            return {"poc": close[-1] if len(close) > 0 else 0, "value_area_high": 0, "value_area_low": 0}
        
        # Use last N periods for volume profile
        recent_high = high[-self.volume_profile_window:]
        recent_low = low[-self.volume_profile_window:]
        recent_close = close[-self.volume_profile_window:]
        recent_volume = volume[-self.volume_profile_window:]
        
        # Create price levels
        price_min = np.min(recent_low)
        price_max = np.max(recent_high)
        price_levels = np.linspace(price_min, price_max, self.volume_profile_levels)
        
        # Calculate volume at each price level
        volume_at_price = np.zeros(len(price_levels))
        
        for i in range(len(recent_close)):
            # Find closest price level
            level_idx = np.argmin(np.abs(price_levels - recent_close[i]))
            volume_at_price[level_idx] += recent_volume[i]
        
        # Point of Control (POC) - price level with highest volume
        poc_idx = np.argmax(volume_at_price)
        poc = price_levels[poc_idx]
        
        # Value Area (70% of volume around POC)
        total_volume = np.sum(volume_at_price)
        target_volume = total_volume * 0.7
        
        # Expand around POC to find value area
        value_area_volume = volume_at_price[poc_idx]
        lower_idx = poc_idx
        upper_idx = poc_idx
        
        while value_area_volume < target_volume and (lower_idx > 0 or upper_idx < len(price_levels) - 1):
            lower_candidate = volume_at_price[lower_idx - 1] if lower_idx > 0 else 0
            upper_candidate = volume_at_price[upper_idx + 1] if upper_idx < len(price_levels) - 1 else 0
            
            if lower_candidate >= upper_candidate and lower_idx > 0:
                lower_idx -= 1
                value_area_volume += lower_candidate
            elif upper_idx < len(price_levels) - 1:
                upper_idx += 1
                value_area_volume += upper_candidate
            else:
                break
        
        return {
            "poc": poc,
            "value_area_high": price_levels[upper_idx],
            "value_area_low": price_levels[lower_idx]
        }
    
    def _calculate_resistance(self, high: np.ndarray, close: np.ndarray) -> float:
        """Calculate resistance level (simplified)"""
        if len(high) < 20:
            return np.max(high) if len(high) > 0 else 0
        
        # Recent highs
        recent_highs = high[-20:]
        return np.percentile(recent_highs, 95)  # 95th percentile as resistance
    
    def _calculate_support(self, low: np.ndarray, close: np.ndarray) -> float:
        """Calculate support level (simplified)"""
        if len(low) < 20:
            return np.min(low) if len(low) > 0 else 0
        
        # Recent lows
        recent_lows = low[-20:]
        return np.percentile(recent_lows, 5)  # 5th percentile as support
    
    def _check_long_conditions(self, price: float, volume: float, obv: float, vroc: float,
                              vwap: float, avg_vol: float, resistance: float, poc: float,
                              obv_array: np.ndarray) -> Dict[str, Any]:
        """
        Check LONG signal conditions as per prompt specifications
        """
        conditions = {}
        
        # Price breaks above resistance with volume > 150% of 20-period average
        conditions["price_breakout"] = price > resistance
        conditions["volume_confirm"] = volume > (avg_vol * self.volume_breakout_threshold)
        
        # OBV shows positive divergence (simplified: current OBV > recent average)
        if len(obv_array) >= 10:
            recent_obv_avg = np.mean(obv_array[-10:-5]) if len(obv_array) >= 10 else obv
            conditions["obv_divergence"] = obv > recent_obv_avg
        else:
            conditions["obv_divergence"] = True
        
        # Volume Profile shows buying above POC
        conditions["buying_above_poc"] = price > poc
        
        # VROC > 200% during breakout
        conditions["vroc_breakout"] = vroc > (self.vroc_breakout_threshold * 100)
        
        # Price above VWAP with expanding volume
        conditions["price_above_vwap"] = price > vwap
        conditions["expanding_volume"] = volume > avg_vol
        
        # All conditions must be met
        conditions["all_met"] = all([
            conditions["price_breakout"],
            conditions["volume_confirm"],
            conditions["obv_divergence"],
            conditions["buying_above_poc"],
            conditions["vroc_breakout"],
            conditions["price_above_vwap"],
            conditions["expanding_volume"]
        ])
        
        return conditions
    
    def _check_short_conditions(self, price: float, volume: float, obv: float, vroc: float,
                               vwap: float, avg_vol: float, support: float, poc: float,
                               obv_array: np.ndarray) -> Dict[str, Any]:
        """
        Check SHORT signal conditions as per prompt specifications
        """
        conditions = {}
        
        # Price breaks below support with volume > 150% of 20-period average
        conditions["price_breakdown"] = price < support
        conditions["volume_confirm"] = volume > (avg_vol * self.volume_breakout_threshold)
        
        # OBV shows negative divergence (simplified: current OBV < recent average)
        if len(obv_array) >= 10:
            recent_obv_avg = np.mean(obv_array[-10:-5]) if len(obv_array) >= 10 else obv
            conditions["obv_divergence"] = obv < recent_obv_avg
        else:
            conditions["obv_divergence"] = True
        
        # Volume Profile shows selling below POC
        conditions["selling_below_poc"] = price < poc
        
        # VROC > 200% during breakdown
        conditions["vroc_breakdown"] = vroc > (self.vroc_breakout_threshold * 100)
        
        # Price below VWAP with expanding volume
        conditions["price_below_vwap"] = price < vwap
        conditions["expanding_volume"] = volume > avg_vol
        
        # All conditions must be met
        conditions["all_met"] = all([
            conditions["price_breakdown"],
            conditions["volume_confirm"],
            conditions["obv_divergence"],
            conditions["selling_below_poc"],
            conditions["vroc_breakdown"],
            conditions["price_below_vwap"],
            conditions["expanding_volume"]
        ])
        
        return conditions
    
    def check_exit_conditions(self, position, current_price: float, indicators: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check exit conditions as per prompt specifications
        """
        exit_conditions = {
            "should_exit": False,
            "exit_reason": None
        }
        
        # Profit Taking conditions
        vroc = indicators.get("vroc", np.array([0]))
        current_vroc = vroc[-1] if len(vroc) > 0 else 0
        atr = indicators.get("atr", np.array([0]))
        current_atr = atr[-1] if len(atr) > 0 else (current_price * 0.02)
        current_volume = indicators.get("current_volume", 0)
        avg_volume = indicators.get("avg_volume_20", np.array([0]))
        current_avg_vol = avg_volume[-1] if len(avg_volume) > 0 else current_volume
        
        # Volume climax (VROC > 300%)
        if current_vroc > (self.volume_climax_threshold * 100):
            exit_conditions["should_exit"] = True
            exit_conditions["exit_reason"] = "VOLUME_CLIMAX"
            return exit_conditions
        
        # Price hits 2x ATR
        if position.trade_type == TradeType.LONG:
            if current_price >= (position.entry_price + (self.atr_multiplier * current_atr)):
                exit_conditions["should_exit"] = True
                exit_conditions["exit_reason"] = "TARGET_2ATR"
                return exit_conditions
        else:
            if current_price <= (position.entry_price - (self.atr_multiplier * current_atr)):
                exit_conditions["should_exit"] = True
                exit_conditions["exit_reason"] = "TARGET_2ATR"
                return exit_conditions
        
        # Volume drops below 80% of entry volume
        entry_volume = getattr(position, 'entry_volume', current_avg_vol)
        if current_volume < (entry_volume * 0.8):
            exit_conditions["should_exit"] = True
            exit_conditions["exit_reason"] = "LOW_VOLUME"
            return exit_conditions
        
        return exit_conditions