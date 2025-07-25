import asyncio
import json
import websockets
import logging
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime
import aiohttp
from dataclasses import dataclass

@dataclass
class DhanHQConfig:
    client_id: str
    access_token: str
    websocket_url: str = "wss://api.dhan.co"
    api_url: str = "https://api.dhan.co"

class DhanHQWebSocketClient:
    """
    DhanHQ WebSocket client for live market data streaming
    Based on DhanHQ WebSocket API v2 documentation
    """
    
    def __init__(self, config: DhanHQConfig):
        self.config = config
        self.websocket = None
        self.is_connected = False
        self.subscriptions = set()
        self.callbacks = {}
        self.logger = logging.getLogger(__name__)
        
        # Instrument mapping for Nifty50 and BankNifty options
        self.instruments = {
            "NIFTY": "NSE_INDEX|Nifty 50",
            "BANKNIFTY": "NSE_INDEX|Nifty Bank"
        }
        
        # Data storage for OHLCV construction
        self.tick_data = {}
        self.ohlcv_data = {}
        
    async def connect(self):
        """
        Establish WebSocket connection to DhanHQ
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.config.access_token}",
                "Client-Id": self.config.client_id
            }
            
            self.websocket = await websockets.connect(
                self.config.websocket_url,
                extra_headers=headers,
                ping_interval=30,
                ping_timeout=10
            )
            
            self.is_connected = True
            self.logger.info("Connected to DhanHQ WebSocket")
            
            # Start listening for messages
            asyncio.create_task(self._listen_messages())
            
        except Exception as e:
            self.logger.error(f"Failed to connect to DhanHQ WebSocket: {e}")
            raise
    
    async def disconnect(self):
        """
        Close WebSocket connection
        """
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            self.logger.info("Disconnected from DhanHQ WebSocket")
    
    async def subscribe_to_feed(self, instruments: List[str], feed_type: str = "Full"):
        """
        Subscribe to live market data feed
        
        Args:
            instruments: List of instrument identifiers
            feed_type: Type of feed ("Full", "Quote", "Ticker")
        """
        if not self.is_connected:
            await self.connect()
        
        subscription_message = {
            "RequestCode": 15,
            "InstrumentCount": len(instruments),
            "InstrumentList": instruments,
            "Xts-Market-Data-Port": "12002"
        }
        
        try:
            await self.websocket.send(json.dumps(subscription_message))
            self.subscriptions.update(instruments)
            self.logger.info(f"Subscribed to {len(instruments)} instruments")
            
        except Exception as e:
            self.logger.error(f"Failed to subscribe to instruments: {e}")
            raise
    
    async def subscribe_nifty_banknifty_options(self):
        """
        Subscribe to Nifty50 and BankNifty options live data
        """
        # Get current month expiry options (simplified)
        instruments = []
        
        # Add Nifty50 index
        instruments.append(self.instruments["NIFTY"])
        
        # Add BankNifty index
        instruments.append(self.instruments["BANKNIFTY"])
        
        # Subscribe to the instruments
        await self.subscribe_to_feed(instruments)
    
    async def _listen_messages(self):
        """
        Listen for incoming WebSocket messages
        """
        try:
            async for message in self.websocket:
                await self._process_message(message)
                
        except websockets.exceptions.ConnectionClosed:
            self.logger.warning("WebSocket connection closed")
            self.is_connected = False
            await self._handle_reconnection()
            
        except Exception as e:
            self.logger.error(f"Error in message listener: {e}")
            await self._handle_reconnection()
    
    async def _process_message(self, message: str):
        """
        Process incoming market data message
        """
        try:
            data = json.loads(message)
            
            # Extract market data based on DhanHQ message format
            if "MessageCode" in data:
                message_code = data["MessageCode"]
                
                if message_code == 4:  # Market data update
                    await self._process_market_data(data)
                elif message_code == 5:  # Index data
                    await self._process_index_data(data)
                    
        except json.JSONDecodeError:
            self.logger.error(f"Failed to parse message: {message}")
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
    
    async def _process_market_data(self, data: Dict[str, Any]):
        """
        Process market data and construct OHLCV
        """
        try:
            # Extract relevant fields from DhanHQ message
            symbol = data.get("symbol", "")
            ltp = data.get("Ltp", 0)
            volume = data.get("Volume", 0)
            high = data.get("High", ltp)
            low = data.get("Low", ltp)
            open_price = data.get("Open", ltp)
            timestamp = datetime.now()
            
            # Store tick data
            tick_info = {
                "symbol": symbol,
                "ltp": ltp,
                "volume": volume,
                "high": high,
                "low": low,
                "open": open_price,
                "timestamp": timestamp,
                "oi": data.get("Oi", 0),  # Open Interest
                "bid": data.get("BidPrice", 0),
                "ask": data.get("AskPrice", 0)
            }
            
            # Update OHLCV data
            self._update_ohlcv(symbol, tick_info)
            
            # Call registered callbacks
            await self._notify_callbacks("market_data", tick_info)
            
        except Exception as e:
            self.logger.error(f"Error processing market data: {e}")
    
    async def _process_index_data(self, data: Dict[str, Any]):
        """
        Process index data (Nifty50, BankNifty)
        """
        try:
            symbol = data.get("symbol", "")
            ltp = data.get("IndexValue", 0)
            timestamp = datetime.now()
            
            index_info = {
                "symbol": symbol,
                "ltp": ltp,
                "change": data.get("NetChange", 0),
                "change_percent": data.get("PercentChange", 0),
                "timestamp": timestamp
            }
            
            await self._notify_callbacks("index_data", index_info)
            
        except Exception as e:
            self.logger.error(f"Error processing index data: {e}")
    
    def _update_ohlcv(self, symbol: str, tick_data: Dict[str, Any]):
        """
        Update OHLCV data from tick data for multiple timeframes
        """
        timeframes = ["1min", "5min", "15min", "daily"]
        
        for tf in timeframes:
            if symbol not in self.ohlcv_data:
                self.ohlcv_data[symbol] = {}
            
            if tf not in self.ohlcv_data[symbol]:
                self.ohlcv_data[symbol][tf] = {
                    "open": tick_data["ltp"],
                    "high": tick_data["high"],
                    "low": tick_data["low"],
                    "close": tick_data["ltp"],
                    "volume": tick_data["volume"],
                    "timestamp": tick_data["timestamp"]
                }
            else:
                # Update OHLCV based on timeframe
                current_bar = self.ohlcv_data[symbol][tf]
                
                # Check if we need a new bar based on timeframe
                if self._should_create_new_bar(current_bar["timestamp"], tick_data["timestamp"], tf):
                    # Create new bar
                    self.ohlcv_data[symbol][tf] = {
                        "open": tick_data["ltp"],
                        "high": tick_data["high"],
                        "low": tick_data["low"],
                        "close": tick_data["ltp"],
                        "volume": tick_data["volume"],
                        "timestamp": tick_data["timestamp"]
                    }
                else:
                    # Update current bar
                    current_bar["high"] = max(current_bar["high"], tick_data["high"])
                    current_bar["low"] = min(current_bar["low"], tick_data["low"])
                    current_bar["close"] = tick_data["ltp"]
                    current_bar["volume"] += tick_data["volume"]
    
    def _should_create_new_bar(self, last_timestamp: datetime, current_timestamp: datetime, timeframe: str) -> bool:
        """
        Determine if a new OHLCV bar should be created
        """
        time_diff = (current_timestamp - last_timestamp).total_seconds()
        
        if timeframe == "1min":
            return time_diff >= 60
        elif timeframe == "5min":
            return time_diff >= 300
        elif timeframe == "15min":
            return time_diff >= 900
        elif timeframe == "daily":
            return current_timestamp.date() != last_timestamp.date()
        
        return False
    
    async def _notify_callbacks(self, event_type: str, data: Dict[str, Any]):
        """
        Notify registered callbacks
        """
        if event_type in self.callbacks:
            for callback in self.callbacks[event_type]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                except Exception as e:
                    self.logger.error(f"Error in callback: {e}")
    
    def register_callback(self, event_type: str, callback: Callable):
        """
        Register callback for specific event type
        """
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        self.callbacks[event_type].append(callback)
    
    async def _handle_reconnection(self):
        """
        Handle WebSocket reconnection
        """
        self.logger.info("Attempting to reconnect...")
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries and not self.is_connected:
            try:
                await asyncio.sleep(2 ** retry_count)  # Exponential backoff
                await self.connect()
                
                # Re-subscribe to previous subscriptions
                if self.subscriptions:
                    await self.subscribe_to_feed(list(self.subscriptions))
                
                self.logger.info("Successfully reconnected")
                break
                
            except Exception as e:
                retry_count += 1
                self.logger.error(f"Reconnection attempt {retry_count} failed: {e}")
        
        if retry_count >= max_retries:
            self.logger.error("Max reconnection attempts reached")
    
    def get_latest_ohlcv(self, symbol: str, timeframe: str = "1min") -> Optional[Dict[str, Any]]:
        """
        Get latest OHLCV data for symbol and timeframe
        """
        if symbol in self.ohlcv_data and timeframe in self.ohlcv_data[symbol]:
            ohlcv = self.ohlcv_data[symbol][timeframe].copy()
            ohlcv["symbol"] = symbol
            ohlcv["timeframe"] = timeframe
            return ohlcv
        return None
    
    async def get_historical_data(self, symbol: str, timeframe: str, from_date: str, to_date: str) -> List[Dict[str, Any]]:
        """
        Fetch historical data from DhanHQ API (for initial data loading)
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.config.access_token}",
                "Client-Id": self.config.client_id,
                "Content-Type": "application/json"
            }
            
            # DhanHQ historical data endpoint
            url = f"{self.config.api_url}/charts/historical"
            
            params = {
                "symbol": symbol,
                "resolution": timeframe,
                "from": from_date,
                "to": to_date
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._format_historical_data(data)
                    else:
                        self.logger.error(f"Failed to fetch historical data: {response.status}")
                        return []
                        
        except Exception as e:
            self.logger.error(f"Error fetching historical data: {e}")
            return []
    
    def _format_historical_data(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Format raw historical data from DhanHQ API
        """
        formatted_data = []
        
        try:
            # DhanHQ returns data in arrays
            times = raw_data.get("t", [])
            opens = raw_data.get("o", [])
            highs = raw_data.get("h", [])
            lows = raw_data.get("l", [])
            closes = raw_data.get("c", [])
            volumes = raw_data.get("v", [])
            
            for i in range(len(times)):
                formatted_data.append({
                    "timestamp": datetime.fromtimestamp(times[i]),
                    "open": opens[i],
                    "high": highs[i],
                    "low": lows[i],
                    "close": closes[i],
                    "volume": volumes[i]
                })
                
        except Exception as e:
            self.logger.error(f"Error formatting historical data: {e}")
        
        return formatted_data
    
    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Place order via DhanHQ API (for live trading)
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.config.access_token}",
                "Client-Id": self.config.client_id,
                "Content-Type": "application/json"
            }
            
            url = f"{self.config.api_url}/orders"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=order_data) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        self.logger.info(f"Order placed successfully: {result}")
                    else:
                        self.logger.error(f"Order placement failed: {result}")
                    
                    return result
                    
        except Exception as e:
            self.logger.error(f"Error placing order: {e}")
            return {"error": str(e)}