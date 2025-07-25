from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import strategies, trades, market_data, dashboard, live_trading
from app.api.websocket import get_connection_manager
import uvicorn
import os
import json
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Live Market Strategy Simulator",
    description="FastAPI backend for multi-strategy trading simulator with live mode",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(strategies.router, prefix="/api/strategies", tags=["strategies"])
app.include_router(trades.router, prefix="/api/trades", tags=["trades"])
app.include_router(market_data.router, prefix="/api/market-data", tags=["market-data"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(live_trading.router, prefix="/api/live-trading", tags=["live-trading"])

@app.get("/")
async def root():
    return {"message": "Live Market Strategy Simulator API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# WebSocket endpoints
@app.websocket("/ws/market-data")
async def websocket_market_data(websocket: WebSocket):
    """WebSocket endpoint for real-time market data"""
    manager = await get_connection_manager()
    await manager.connect(websocket, "market_data")
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle subscription requests
            if message.get("action") == "subscribe":
                symbol = message.get("symbol")
                if symbol:
                    await manager.subscribe_to_symbol(symbol)
                    await websocket.send_text(json.dumps({
                        "type": "subscription",
                        "status": "subscribed",
                        "symbol": symbol
                    }))
            
            elif message.get("action") == "unsubscribe":
                symbol = message.get("symbol")
                if symbol:
                    await manager.unsubscribe_from_symbol(symbol)
                    await websocket.send_text(json.dumps({
                        "type": "subscription", 
                        "status": "unsubscribed",
                        "symbol": symbol
                    }))
                    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "market_data")
    except Exception as e:
        logger.error(f"WebSocket error in market-data: {e}")
        await manager.disconnect(websocket, "market_data")

@app.websocket("/ws/system-status") 
async def websocket_system_status(websocket: WebSocket):
    """WebSocket endpoint for system status updates"""
    manager = await get_connection_manager()
    await manager.connect(websocket, "system_status")
    
    try:
        # Send initial status
        await websocket.send_text(json.dumps({
            "type": "system_status",
            "data": {
                "websocket_connected": manager.is_market_connected,
                "active_connections": sum(len(conns) for conns in manager.active_connections.values()),
                "market_feed_status": "connected" if manager.is_market_connected else "disconnected"
            }
        }))
        
        while True:
            # Keep connection alive
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "system_status")
    except Exception as e:
        logger.error(f"WebSocket error in system-status: {e}")
        await manager.disconnect(websocket, "system_status")

@app.websocket("/ws/trades")
async def websocket_trades(websocket: WebSocket):
    """WebSocket endpoint for real-time trade updates"""
    manager = await get_connection_manager()
    await manager.connect(websocket, "trades")
    
    try:
        while True:
            # Keep connection alive - trade updates are pushed from strategy engine
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "trades")
    except Exception as e:
        logger.error(f"WebSocket error in trades: {e}")
        await manager.disconnect(websocket, "trades")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)