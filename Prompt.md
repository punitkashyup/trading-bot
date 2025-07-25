# Live Market Strategy Simulator - FastAPI + Next.js + Supabase + DhanHQ

```
Use context7 to research the latest documentation and best practices for:
1. Next.js 15 App Router and API routes integration
2. Python 3.12 FastAPI with WebSocket implementation
3. Supabase real-time subscriptions and database operations
4. DhanHQ API v2 documentation: https://dhanhq.co/docs/v2/
5. DhanHQ WebSocket live market feed: https://dhanhq.co/docs/v2/live-market-feed/
6. Python technical analysis libraries (TA-Lib, pandas-ta) latest versions
7. Financial data processing and real-time streaming patterns

Then build a complete live market strategy simulator with the following specifications:

## 🎯 Project Goal: Multi-Strategy Trading Simulator with Live Mode

### System Architecture Requirements:
- **Backend**: Python 3.12 FastAPI with WebSocket handling
- **Frontend**: Next.js 15 with Magic UI components (NO landing page needed)
- **Database**: Supabase with real-time subscriptions
- **Data Source**: DhanHQ WebSocket API (live data only, NO mock data)
- **Trading Modes**: 
  * **Simulation Mode**: Virtual/Paper trading (default for all strategies)
  * **Live Mode**: Real order placement via DhanHQ API (user-enabled per strategy)

### Multi-Strategy Architecture:
```python
# Use context7 to research modular strategy patterns, then implement:

Strategy Engine Design:
- Pluggable strategy architecture for multiple trading strategies
- Each strategy runs independently with its own configuration
- Individual live mode toggle per strategy
- Shared market data feed across all strategies
- Independent P&L tracking per strategy
- Strategy-specific risk management rules
```

### Live Mode Functionality:
```python
# Live Mode Operation Flow:

Default State (Simulation Mode):
- All strategies start in simulation mode
- Strategies analyze live DhanHQ data in real-time
- Generate signals and track virtual trades in database
- No actual orders placed with DhanHQ
- Users can analyze strategy performance safely

Live Mode Toggle (Per Strategy):
- User reviews strategy performance in simulation
- User enables "Live Mode" for specific strategy via frontend toggle
- System validates strategy performance and risk parameters
- Once enabled, strategy starts placing real orders via DhanHQ API
- Real trades tracked alongside virtual trades
- User can disable live mode anytime to return to simulation

Live Mode Requirements:
- Strategy must have positive simulation P&L
- Minimum 10 successful virtual trades before going live
- User confirmation modal before enabling live mode
- Real-time risk monitoring with automatic circuit breakers
- Emergency stop functionality to halt all live strategies
```

## 🏗️ Backend Implementation (FastAPI + Python 3.12):

### Core API Structure:
```python
# Use context7 to research FastAPI project structure, then implement:

/backend
  /app
    /api
      /endpoints
        strategies.py          # Multi-strategy management endpoints
        trades.py             # Virtual and live trade tracking
        market_data.py        # DhanHQ data ingestion
        dashboard.py          # Dashboard data APIs
        live_trading.py       # Live mode management and order placement
    /core
      /strategies
        base_strategy.py      # Abstract base strategy class
        pva_strategy.py       # Price Volume Action strategy
        momentum_strategy.py  # Future strategy example
        mean_reversion.py     # Future strategy example  
        strategy_factory.py   # Strategy instantiation
        strategy_engine.py    # Multi-strategy orchestrator
        indicators.py         # Shared technical indicators
      /market_data
        dhanhq_client.py      # DhanHQ WebSocket client
        order_manager.py      # DhanHQ order placement
        data_processor.py     # Real-time data processing
        ohlcv_builder.py      # OHLCV candle construction
    /services
      supabase_client.py      # Database operations
      signal_processor.py     # Signal generation and logging
      trade_simulator.py      # Virtual trade execution
      live_trader.py          # Real order execution
      risk_manager.py         # Multi-strategy risk management
    /models
      strategy_models.py      # Strategy configuration models
      trade_models.py         # Trade and signal models
      market_models.py        # Market data models
    /background
      scheduled_tasks.py      # EOD exit, cleanup tasks
      websocket_handler.py    # DhanHQ WebSocket manager
      strategy_monitor.py     # Multi-strategy monitoring
    main.py
```

### API Endpoints Required:
```python
# Research FastAPI patterns via context7, then implement:

Multi-Strategy Management APIs:
- GET /api/strategies/list                  # List all available strategies
- POST /api/strategies/create              # Create new strategy instance
- POST /api/strategies/toggle/{strategy_id} # Enable/disable strategy simulation
- POST /api/strategies/live-mode/{strategy_id} # Toggle live mode for specific strategy
- GET /api/strategies/summary              # Today's summary for all strategies
- GET /api/strategies/{strategy_id}/performance # Individual strategy performance

Trade Management APIs:
- GET /api/trades/all                      # List all trades (virtual + live)
- GET /api/trades/virtual/{strategy_id}    # Virtual trades for specific strategy
- GET /api/trades/live/{strategy_id}       # Live trades for specific strategy
- PUT /api/strategies/config/{strategy_id} # Update strategy parameters

Live Trading APIs:
- POST /api/live-trading/validate/{strategy_id} # Validate strategy for live mode
- POST /api/live-trading/enable/{strategy_id}   # Enable live trading for strategy
- POST /api/live-trading/disable/{strategy_id}  # Disable live trading for strategy
- POST /api/live-trading/emergency-stop         # Stop all live strategies immediately
- GET /api/live-trading/status                  # Live trading status for all strategies

Analysis APIs:
- POST /api/analysis/run-daily/{strategy_id}    # Manual daily analysis for strategy
- GET /api/dashboard/pnl                        # Cumulative P&L for all strategies
- GET /api/dashboard/pnl/{strategy_id}          # P&L for specific strategy
```

### DhanHQ WebSocket Integration:
```python
# Use context7 to research DhanHQ WebSocket API, then implement:

WebSocket Features:
- Subscribe to Nifty50 and BankNifty options live data
- Real-time price, volume, LTP, OI ingestion
- Multi-timeframe OHLCV construction (1min, 5min, 15min, daily)
- Connection management and reconnection handling
- Data validation and error handling
```

## 📊 Multi-Strategy Framework Implementation:

### Base Strategy Architecture:
```python
# Use context7 to research strategy pattern implementation:

Abstract Base Strategy Class:
class BaseStrategy:
    def __init__(self, strategy_id, config):
        self.strategy_id = strategy_id
        self.config = config
        self.is_simulation_active = False
        self.is_live_mode = False
        self.virtual_positions = []
        self.live_positions = []
    
    def analyze_market_data(self, market_data):
        # Abstract method - implemented by each strategy
        pass
    
    def generate_signals(self, indicators):
        # Abstract method - strategy-specific logic
        pass
    
    def execute_virtual_trade(self, signal):
        # Shared virtual trading logic
        pass
    
    def execute_live_trade(self, signal):
        # Shared live trading logic (only if live_mode enabled)
        pass
    
    def validate_for_live_mode(self):
        # Validation before enabling live mode
        pass

Strategy Implementations:
1. PVA_Strategy(BaseStrategy) - Price Volume Action
2. MomentumStrategy(BaseStrategy) - Future implementation
3. MeanReversionStrategy(BaseStrategy) - Future implementation
4. ArbitrageStrategy(BaseStrategy) - Future implementation
```

### PVA Strategy Implementation (Exact Requirements - No Changes):
```python
# Implement PVA strategy with exact specifications:

class PVA_Strategy(BaseStrategy):
    def __init__(self, strategy_id, config):
        super().__init__(strategy_id, config)
        self.name = "Price Volume Action Strategy"
        self.instruments = ["Nifty50", "BankNifty"]
        
    # All PVA logic remains exactly as specified:
    # - Technical indicators: OBV, VROC, A/D Line, VWAP, Volume Profile, POC, etc.
    # - Entry conditions: Same exact criteria for LONG/SHORT
    # - Exit conditions: Same exact profit taking and stop loss rules
    # - Risk management: Same position sizing and risk controls
```

### Technical Requirements:

# Use context7 to research technical indicator implementation:

 **Strategies**
- Modular engine to plug multiple strategies:
  - Start with “PVA Strategy”:
    - REQUIREMENTS:
      - Timeframes: 1-minute, 5-minute, 15-minute, and daily charts
      - Instruments: Nifty50 and BankNifty options contracts
    - CORE_INDICATORS_TO_IMPLEMENT:
      - On-Balance Volume (OBV)
      - Volume Rate of Change (VROC)
      - Accumulation/Distribution Line
      - Volume Weighted Average Price (VWAP)
      - Volume Profile (30-day window)
      - Point of Control (POC)
      - Value Area High / Low
      - Average Volume (20-period and 50-period SMA)
    - Entry criteria: 
      LONG Option Signal:
        Price breaks above resistance with volume > 150% of 20-period average
        OBV shows positive divergence
        Volume Profile shows buying above POC
        VROC > 200% during breakout
        Price above VWAP with expanding volume
      SHORT Option Signal:
        Price breaks below support with volume > 150% of 20-period average
        OBV shows negative divergence
        Volume Profile shows selling below POC
        VROC > 200% during breakdown
        Price below VWAP with expanding volume
    - Exit criteria:
      Profit Taking:
        Volume climax (VROC > 300%)
        Price hits 2x ATR
        OBV divergence
        Volume drops below 80% of entry volume
      Stop Loss:
        Price-based: 1.5x ATR from entry
        Volume-based: Volume < 50% of average for 3 bars
        Time-based: Exit before expiry theta decay kicks in
    - Risk management: 
        Max position size: 2% of capital
        Position sizing:
        VROC > 250% ⇒ full size
        VROC 150–250% ⇒ 75%
        VROC < 150% ⇒ 50%
        Max 3 open trades
        Max daily loss: 6%
        Minimum R:R ratio: 1:2
        Avoid re-entry in same direction within 30 mins

### Background Tasks:
```python
# Use context7 to research FastAPI background tasks:

Scheduled Operations:
- Auto EOD Exit: Close all positions at 3:15 PM
- Same-side re-entry prevention: 30-minute cooldown tracking
- Daily P&L calculation and logging
- Strategy performance analytics
```

## 🎨 Frontend Implementation (Next.js 15 + Magic UI):

### Dashboard Interface (No Landing Page):
```typescript
# Use context7 to research Next.js 15 patterns, then implement:

Core Dashboard Components:
- User authentication and session management
- Strategy management panel with toggle switches
- Real-time trade monitoring table
- P&L tracking with animated counters
- Live mode toggle with confirmation
- Strategy configuration panels
```

### Magic UI Components Required:
```typescript
Dashboard Layout:
- Header with user info and live status indicator
- Main grid with strategy cards and trade tables
- Sidebar with quick actions and settings
- Real-time data feed with animated updates

Interactive Elements:
- Strategy toggle switches with smooth animations
- Trade table with sortable columns and hover effects
- P&L cards with animated number counters
- Live mode toggle with confirmation modal
- Configuration forms with floating labels
- Alert notifications with slide animations
```

### Real-time Data Display:
```typescript
# Use context7 to research Supabase real-time subscriptions:

Live Dashboard Features:
- Real-time strategy signals with Magic UI alerts
- Live trade updates with smooth transitions
- P&L tracking with animated progress bars
- Strategy performance metrics with charts
- Live market data feed with ticker animations
```

## 🗄️ Database Schema (Supabase):

### Core Tables:
```sql
# Use context7 to research Supabase schema best practices:

-- Multi-Strategy Configuration
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL, -- 'PVA', 'MOMENTUM', 'MEAN_REVERSION'
    is_simulation_active BOOLEAN DEFAULT false,
    is_live_mode BOOLEAN DEFAULT false,
    live_mode_enabled_at TIMESTAMPTZ,
    config JSONB NOT NULL,
    performance_metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Virtual and Live Trades (Combined)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id),
    trade_mode VARCHAR(10) NOT NULL, -- 'VIRTUAL' or 'LIVE'
    symbol VARCHAR(50) NOT NULL,
    trade_type VARCHAR(10) NOT NULL, -- 'LONG' or 'SHORT'
    entry_time TIMESTAMPTZ NOT NULL,
    entry_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    stop_loss DECIMAL(10,2),
    target_price DECIMAL(10,2),
    exit_time TIMESTAMPTZ,
    exit_price DECIMAL(10,2),
    exit_reason VARCHAR(50), -- 'TARGET', 'STOP_LOSS', 'EOD', 'MANUAL'
    pnl DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'OPEN',
    dhanhq_order_id VARCHAR(100), -- Only populated for live trades
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading Signals (Multi-Strategy)
CREATE TABLE trading_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id),
    symbol VARCHAR(50) NOT NULL,
    signal_type VARCHAR(10) NOT NULL,
    signal_strength DECIMAL(5,2),
    indicators JSONB NOT NULL, -- Strategy-specific indicator values
    executed BOOLEAN DEFAULT false,
    execution_mode VARCHAR(10), -- 'VIRTUAL' or 'LIVE'
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy Performance Tracking
CREATE TABLE strategy_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id),
    date DATE NOT NULL,
    virtual_pnl DECIMAL(12,2) DEFAULT 0,
    live_pnl DECIMAL(12,2) DEFAULT 0,
    virtual_trades INTEGER DEFAULT 0,
    live_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2),
    max_drawdown DECIMAL(10,2),
    sharpe_ratio DECIMAL(8,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Mode Validation Log
CREATE TABLE live_mode_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id),
    validation_status VARCHAR(20) NOT NULL, -- 'PASSED', 'FAILED'
    validation_criteria JSONB NOT NULL,
    validation_results JSONB NOT NULL,
    validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Stop Log
CREATE TABLE emergency_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    triggered_by VARCHAR(100),
    reason TEXT,
    affected_strategies JSONB,
    stopped_at TIMESTAMPTZ DEFAULT NOW()
);

-- OHLCV Data (Shared across strategies)
CREATE TABLE ohlcv_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, timeframe, timestamp)
);
```

## 🚀 Implementation Steps:

### Phase 1: Research & Setup
```
1. Use context7 to research DhanHQ WebSocket API documentation
2. Research FastAPI WebSocket implementation patterns
3. Study Supabase real-time subscriptions
4. Research Python 3.12 technical analysis libraries
5. Set up project structure with latest dependencies
```

### Phase 2: Backend Core Development
```
1. Implement DhanHQ WebSocket client and data ingestion
2. Build PVA strategy with exact indicator implementations
3. Create virtual trade simulation engine
4. Implement risk management and position sizing
5. Set up Supabase database operations
```

### Phase 3: Strategy Engine & APIs
```
1. Build modular strategy engine framework
2. Implement all FastAPI endpoints
3. Add background task scheduling
4. Create signal generation and logging
5. Implement real-time data processing
```

### Phase 4: Frontend Dashboard
```
1. Create Next.js 15 app with Magic UI components
2. Build strategy management interface
3. Implement real-time trade monitoring
4. Add P&L tracking and analytics
5. Create live mode toggle and controls
```

### Phase 5: Integration & Testing
```
1. Connect frontend to FastAPI backend
2. Test with live DhanHQ data streams
3. Validate PVA strategy signal generation
4. Test virtual trade execution and P&L calculation
5. Optimize real-time performance
```

## 📋 Key Requirements:
- **No mock data**: All data must come from live DhanHQ WebSocket
- **Virtual trading only**: Simulate trades without real execution
- **Real-time processing**: Live signal generation and monitoring
- **Exact PVA strategy**: Implement all specified indicators and rules
- **Professional UI**: Magic UI components with real-time updates
- **Scalable architecture**: Modular design for multiple strategies

Please start by using context7 to research DhanHQ WebSocket API, FastAPI real-time data processing, and Python 3.12 technical analysis libraries, then begin implementing the complete trading strategy simulator system.
```

## Quick Start Commands:

### Research Phase:
```
Use context7 to research DhanHQ WebSocket API documentation, FastAPI real-time data processing patterns, and Python 3.12 technical analysis libraries, then create the project structure for the live market strategy simulator.
```

### Backend Implementation:
```
Use context7 to research Python 3.12 with laestes pip moudle FastAPI WebSocket implementation, then build the complete PVA strategy engine with DhanHQ live data integration and virtual trade simulation.
```

### Frontend Dashboard:
```
Create a professional trading strategy dashboard using Next.js 15 and Magic UI components - include strategy management, real-time trade monitoring, P&L tracking, and live mode controls without any landing pages.
```