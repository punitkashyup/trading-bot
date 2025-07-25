"""
WebSocket endpoints for real-time market data and system updates
"""

import json
import asyncio
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.core.market_data.dhanhq_client import DhanHQWebSocketClient, DhanHQConfig
from app.services.supabase_client import SupabaseClient
import os

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "market_data": set(),
            "system_status": set(),
            "trades": set()
        }
        self.dhanhq_client: DhanHQWebSocketClient = None
        self.supabase_client: SupabaseClient = None
        self.is_market_connected = False
        
    async def initialize(self):
        """Initialize DhanHQ and Supabase connections"""
        try:
            # Initialize Supabase client
            self.supabase_client = SupabaseClient()
            
            # Initialize DhanHQ WebSocket client
            dhanhq_config = DhanHQConfig(
                client_id=os.getenv("DHANHQ_CLIENT_ID"),
                access_token=os.getenv("DHANHQ_ACCESS_TOKEN"),
                websocket_url=os.getenv("DHANHQ_WEBSOCKET_URL", "wss://api-feed.dhan.co"),
                api_url=os.getenv("DHANHQ_API_URL", "https://api.dhan.co/v2/")
            )
            
            self.dhanhq_client = DhanHQWebSocketClient(dhanhq_config)
            
            # Set up DhanHQ callbacks
            self.dhanhq_client.register_callback("market_data", self._handle_market_data)
            self.dhanhq_client.register_callback("index_data", self._handle_market_data)
            
            logger.info("WebSocket connection manager initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize connection manager: {e}")
    
    async def connect(self, websocket: WebSocket, connection_type: str):
        """Accept a WebSocket connection and add to appropriate group"""
        await websocket.accept()
        
        if connection_type not in self.active_connections:
            connection_type = "market_data"  # Default fallback
            
        self.active_connections[connection_type].add(websocket)
        logger.info(f"Client connected to {connection_type} feed. Total: {len(self.active_connections[connection_type])}")
        
        # Start DhanHQ connection if first market data client
        if connection_type == "market_data" and not self.is_market_connected:
            await self._start_market_feed()
            
    async def disconnect(self, websocket: WebSocket, connection_type: str):
        """Remove WebSocket connection"""
        if connection_type in self.active_connections:
            self.active_connections[connection_type].discard(websocket)
            logger.info(f"Client disconnected from {connection_type} feed. Total: {len(self.active_connections[connection_type])}")
            
        # Stop market feed if no more market data clients
        if connection_type == "market_data" and len(self.active_connections["market_data"]) == 0:
            await self._stop_market_feed()
    
    async def broadcast_to_group(self, connection_type: str, data: Dict[str, Any]):
        """Broadcast data to all connections in a group"""
        if connection_type not in self.active_connections:
            return
            
        message = json.dumps(data)
        disconnected_connections = []
        
        for connection in self.active_connections[connection_type].copy():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send message to client: {e}")
                disconnected_connections.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected_connections:
            self.active_connections[connection_type].discard(connection)
    
    async def subscribe_to_symbol(self, symbol: str):
        """Subscribe to market data for a symbol via DhanHQ"""
        if self.dhanhq_client and self.is_market_connected:
            try:
                # Map symbol to DhanHQ instrument format
                instrument = self._map_symbol_to_instrument(symbol)
                await self.dhanhq_client.subscribe_to_feed([instrument])
                logger.info(f"Subscribed to {symbol} -> {instrument}")
            except Exception as e:
                logger.error(f"Failed to subscribe to {symbol}: {e}")
    
    async def unsubscribe_from_symbol(self, symbol: str):
        """Unsubscribe from market data for a symbol"""
        if self.dhanhq_client and self.is_market_connected:
            try:
                # DhanHQ doesn't have direct unsubscribe, but we can track subscriptions
                logger.info(f"Unsubscribe requested for {symbol}")
            except Exception as e:
                logger.error(f"Failed to unsubscribe from {symbol}: {e}")
    
    def _map_symbol_to_instrument(self, symbol: str) -> str:
        """Map frontend symbol to DhanHQ instrument format"""
        symbol_mapping = {
            "NIFTY": "NSE_INDEX|Nifty 50",
            "BANKNIFTY": "NSE_INDEX|Nifty Bank",
            "RELIANCE": "NSE_EQ|RELIANCE-EQ",
            "TCS": "NSE_EQ|TCS-EQ",
            "HDFCBANK": "NSE_EQ|HDFCBANK-EQ",
            "INFY": "NSE_EQ|INFY-EQ",
            "ITC": "NSE_EQ|ITC-EQ"
        }
        return symbol_mapping.get(symbol, f"NSE_EQ|{symbol}-EQ")
    
    async def _start_market_feed(self):
        """Start DhanHQ market data feed"""
        try:
            if self.dhanhq_client:
                await self.dhanhq_client.connect()
                # Subscribe to NIFTY and BANKNIFTY by default
                await self.dhanhq_client.subscribe_nifty_banknifty_options()
                self.is_market_connected = True
                logger.info("DhanHQ market feed started and subscribed to NIFTY/BANKNIFTY")
        except Exception as e:
            logger.error(f"Failed to start market feed: {e}")
            self.is_market_connected = False
    
    async def _stop_market_feed(self):
        """Stop DhanHQ market data feed"""
        try:
            if self.dhanhq_client:
                await self.dhanhq_client.disconnect()
                self.is_market_connected = False
                logger.info("DhanHQ market feed stopped")
        except Exception as e:
            logger.error(f"Failed to stop market feed: {e}")
    
    async def _handle_market_data(self, data: Dict[str, Any]):
        """Handle incoming market data from DhanHQ"""
        try:
            # Broadcast to all market data clients
            await self.broadcast_to_group("market_data", {
                "type": "market_data",
                "data": data,
                "timestamp": data.get("timestamp")
            })
            
            # Store in database for historical analysis
            if self.supabase_client:
                await self._store_market_data(data)
                
        except Exception as e:
            logger.error(f"Error handling market data: {e}")
    
    async def _handle_connection_status(self, status: Dict[str, Any]):
        """Handle DhanHQ connection status changes"""
        try:
            self.is_market_connected = status.get("connected", False)
            
            # Broadcast system status update
            await self.broadcast_to_group("system_status", {
                "type": "system_status",
                "data": {
                    "websocket_connected": self.is_market_connected,
                    "active_connections": sum(len(conns) for conns in self.active_connections.values()),
                    "market_feed_status": "connected" if self.is_market_connected else "disconnected"
                }
            })
            
        except Exception as e:
            logger.error(f"Error handling connection status: {e}")
    
    async def _store_market_data(self, data: Dict[str, Any]):
        """Store market data in database"""
        try:
            # Store in market_feed table for real-time data
            market_record = {
                "symbol": data.get("symbol"),
                "ltp": data.get("ltp", 0),
                "volume": data.get("volume", 0),
                "timestamp": data.get("timestamp"),
                "data": data  # Store full data as JSONB
            }
            
            self.supabase_client.client.table("market_feed").insert(market_record).execute()
            
        except Exception as e:
            logger.error(f"Failed to store market data: {e}")

# Global connection manager instance
connection_manager = ConnectionManager()

async def get_connection_manager():
    """Get initialized connection manager"""
    if not connection_manager.supabase_client:
        await connection_manager.initialize()
    return connection_manager