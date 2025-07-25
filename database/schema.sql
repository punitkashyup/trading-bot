-- =============================================
-- Live Market Strategy Simulator Database Schema
-- Multi-Strategy Trading Platform with Live Mode
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STRATEGIES TABLE
-- Multi-Strategy Configuration
-- =============================================
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN ('PVA', 'MOMENTUM', 'MEAN_REVERSION', 'ARBITRAGE')),
    is_simulation_active BOOLEAN DEFAULT false,
    is_live_mode BOOLEAN DEFAULT false,
    live_mode_enabled_at TIMESTAMPTZ,
    config JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_config CHECK (jsonb_typeof(config) = 'object'),
    CONSTRAINT valid_performance_metrics CHECK (jsonb_typeof(performance_metrics) = 'object')
);

-- Index for strategy queries
CREATE INDEX idx_strategies_type ON strategies(strategy_type);
CREATE INDEX idx_strategies_active ON strategies(is_simulation_active);
CREATE INDEX idx_strategies_live ON strategies(is_live_mode);
CREATE INDEX idx_strategies_created ON strategies(created_at);

-- =============================================
-- TRADES TABLE
-- Virtual and Live Trades (Combined)
-- =============================================
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    trade_mode VARCHAR(10) NOT NULL CHECK (trade_mode IN ('VIRTUAL', 'LIVE')),
    symbol VARCHAR(50) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('LONG', 'SHORT')),
    entry_time TIMESTAMPTZ NOT NULL,
    entry_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    stop_loss DECIMAL(10,2),
    target_price DECIMAL(10,2),
    exit_time TIMESTAMPTZ,
    exit_price DECIMAL(10,2),
    exit_reason VARCHAR(50) CHECK (exit_reason IN ('TARGET', 'STOP_LOSS', 'EOD', 'MANUAL', 'VOLUME_CLIMAX', 'LOW_VOLUME', 'TARGET_2ATR')),
    pnl DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    dhanhq_order_id VARCHAR(100), -- Only populated for live trades
    entry_volume BIGINT, -- Volume at entry time
    indicators JSONB DEFAULT '{}', -- Indicator values at entry
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_price_values CHECK (entry_price > 0 AND (exit_price IS NULL OR exit_price > 0)),
    CONSTRAINT valid_stop_target CHECK (stop_loss IS NULL OR target_price IS NULL OR stop_loss != target_price),
    CONSTRAINT valid_exit_data CHECK (
        (status = 'OPEN' AND exit_time IS NULL AND exit_price IS NULL) OR
        (status IN ('CLOSED', 'CANCELLED') AND exit_time IS NOT NULL)
    ),
    CONSTRAINT valid_dhanhq_order CHECK (
        (trade_mode = 'VIRTUAL' AND dhanhq_order_id IS NULL) OR
        (trade_mode = 'LIVE')
    )
);

-- Indexes for trade queries
CREATE INDEX idx_trades_strategy ON trades(strategy_id);
CREATE INDEX idx_trades_mode ON trades(trade_mode);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);
CREATE INDEX idx_trades_created ON trades(created_at);
CREATE INDEX idx_trades_strategy_mode ON trades(strategy_id, trade_mode);

-- =============================================
-- TRADING SIGNALS TABLE
-- Multi-Strategy Signal Generation
-- =============================================
CREATE TABLE trading_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('LONG', 'SHORT')),
    signal_strength DECIMAL(5,2) NOT NULL CHECK (signal_strength >= 0),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    indicators JSONB NOT NULL DEFAULT '{}', -- Strategy-specific indicator values
    executed BOOLEAN DEFAULT false,
    execution_mode VARCHAR(10) CHECK (execution_mode IN ('VIRTUAL', 'LIVE')),
    trade_id UUID REFERENCES trades(id), -- Link to executed trade
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_indicators CHECK (jsonb_typeof(indicators) = 'object')
);

-- Indexes for signal queries
CREATE INDEX idx_signals_strategy ON trading_signals(strategy_id);
CREATE INDEX idx_signals_symbol ON trading_signals(symbol);
CREATE INDEX idx_signals_executed ON trading_signals(executed);
CREATE INDEX idx_signals_timestamp ON trading_signals(timestamp);
CREATE INDEX idx_signals_strategy_timestamp ON trading_signals(strategy_id, timestamp);

-- =============================================
-- STRATEGY PERFORMANCE TABLE
-- Daily Performance Tracking per Strategy
-- =============================================
CREATE TABLE strategy_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    virtual_pnl DECIMAL(12,2) DEFAULT 0,
    live_pnl DECIMAL(12,2) DEFAULT 0,
    virtual_trades INTEGER DEFAULT 0 CHECK (virtual_trades >= 0),
    live_trades INTEGER DEFAULT 0 CHECK (live_trades >= 0),
    win_rate DECIMAL(5,2) CHECK (win_rate >= 0 AND win_rate <= 100),
    max_drawdown DECIMAL(10,2),
    sharpe_ratio DECIMAL(8,4),
    total_volume BIGINT DEFAULT 0,
    avg_trade_duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(strategy_id, date)
);

-- Indexes for performance queries
CREATE INDEX idx_performance_strategy ON strategy_performance(strategy_id);
CREATE INDEX idx_performance_date ON strategy_performance(date);
CREATE INDEX idx_performance_strategy_date ON strategy_performance(strategy_id, date);

-- =============================================
-- LIVE MODE VALIDATIONS TABLE
-- Track validation before enabling live mode
-- =============================================
CREATE TABLE live_mode_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('PASSED', 'FAILED')),
    validation_criteria JSONB NOT NULL,
    validation_results JSONB NOT NULL,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_validation_data CHECK (
        jsonb_typeof(validation_criteria) = 'object' AND 
        jsonb_typeof(validation_results) = 'object'
    )
);

-- Indexes for validation queries
CREATE INDEX idx_validations_strategy ON live_mode_validations(strategy_id);
CREATE INDEX idx_validations_status ON live_mode_validations(validation_status);
CREATE INDEX idx_validations_date ON live_mode_validations(validated_at);

-- =============================================
-- EMERGENCY STOPS TABLE (DISABLED - functionality removed)
-- Track emergency stop events
-- =============================================
-- CREATE TABLE emergency_stops (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     triggered_by VARCHAR(100),
--     reason TEXT,
--     affected_strategies JSONB,
--     total_strategies_stopped INTEGER DEFAULT 0,
--     stopped_at TIMESTAMPTZ DEFAULT NOW(),
--     
--     CONSTRAINT valid_affected_strategies CHECK (jsonb_typeof(affected_strategies) = 'array')
-- );

-- Index for emergency stop queries
-- CREATE INDEX idx_emergency_stops_date ON emergency_stops(stopped_at);

-- =============================================
-- OHLCV DATA TABLE
-- Multi-timeframe OHLCV data (Shared across strategies)
-- =============================================
CREATE TABLE ohlcv_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1min', '5min', '15min', 'daily')),
    timestamp TIMESTAMPTZ NOT NULL,
    open_price DECIMAL(10,2) NOT NULL CHECK (open_price > 0),
    high_price DECIMAL(10,2) NOT NULL CHECK (high_price > 0),
    low_price DECIMAL(10,2) NOT NULL CHECK (low_price > 0),
    close_price DECIMAL(10,2) NOT NULL CHECK (close_price > 0),
    volume BIGINT NOT NULL CHECK (volume >= 0),
    oi BIGINT DEFAULT 0, -- Open Interest for options
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timeframe, timestamp),
    CONSTRAINT valid_ohlc_prices CHECK (
        high_price >= low_price AND 
        high_price >= open_price AND 
        high_price >= close_price AND
        low_price <= open_price AND
        low_price <= close_price
    )
);

-- Indexes for OHLCV queries (optimized for time-series data)
CREATE INDEX idx_ohlcv_symbol_timeframe ON ohlcv_data(symbol, timeframe);
CREATE INDEX idx_ohlcv_timestamp ON ohlcv_data(timestamp);
CREATE INDEX idx_ohlcv_symbol_timeframe_timestamp ON ohlcv_data(symbol, timeframe, timestamp);

-- =============================================
-- MARKET DATA FEED TABLE
-- Store real-time tick data from DhanHQ
-- =============================================
CREATE TABLE market_feed (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    ltp DECIMAL(10,2) NOT NULL CHECK (ltp > 0),
    volume BIGINT NOT NULL CHECK (volume >= 0),
    oi BIGINT DEFAULT 0,
    bid_price DECIMAL(10,2),
    ask_price DECIMAL(10,2),
    high DECIMAL(10,2),
    low DECIMAL(10,2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_bid_ask CHECK (
        (bid_price IS NULL AND ask_price IS NULL) OR
        (bid_price IS NOT NULL AND ask_price IS NOT NULL AND ask_price >= bid_price)
    )
);

-- Indexes for market feed (optimized for real-time queries)
CREATE INDEX idx_market_feed_symbol ON market_feed(symbol);
CREATE INDEX idx_market_feed_timestamp ON market_feed(timestamp);
CREATE INDEX idx_market_feed_symbol_timestamp ON market_feed(symbol, timestamp);

-- =============================================
-- USER SESSIONS TABLE (for future authentication)
-- =============================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expiry ON user_sessions(expires_at);

-- =============================================
-- INSTRUMENTS TABLE
-- Available trading instruments
-- =============================================
CREATE TABLE instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    instrument_type VARCHAR(50) NOT NULL CHECK (instrument_type IN ('EQUITY', 'DERIVATIVE', 'CURRENCY', 'COMMODITY')),
    lot_size INTEGER DEFAULT 1 CHECK (lot_size > 0),
    tick_size DECIMAL(10,4) DEFAULT 0.05,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for instruments
CREATE INDEX idx_instruments_symbol ON instruments(symbol);
CREATE INDEX idx_instruments_exchange ON instruments(exchange);
CREATE INDEX idx_instruments_type ON instruments(instrument_type);
CREATE INDEX idx_instruments_active ON instruments(is_active);

-- =============================================
-- SYSTEM STATUS TABLE
-- System monitoring and health status
-- =============================================
CREATE TABLE system_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'maintenance', 'emergency_stop', 'offline')),
    websocket_connected BOOLEAN DEFAULT false,
    active_strategies INTEGER DEFAULT 0,
    live_positions INTEGER DEFAULT 0,
    emergency_stop_active BOOLEAN DEFAULT false,
    message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for system status queries
CREATE INDEX idx_system_status_updated ON system_status(updated_at DESC);
CREATE INDEX idx_system_status_status ON system_status(status);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for strategies table
CREATE TRIGGER update_strategies_updated_at 
    BEFORE UPDATE ON strategies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for instruments table
CREATE TRIGGER update_instruments_updated_at 
    BEFORE UPDATE ON instruments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for system_status table
CREATE TRIGGER update_system_status_updated_at 
    BEFORE UPDATE ON system_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate P&L for trades
CREATE OR REPLACE FUNCTION calculate_trade_pnl()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate PnL when trade is closed
    IF NEW.status = 'CLOSED' AND NEW.exit_price IS NOT NULL THEN
        IF NEW.trade_type = 'LONG' THEN
            NEW.pnl = (NEW.exit_price - NEW.entry_price) * NEW.quantity;
        ELSE -- SHORT
            NEW.pnl = (NEW.entry_price - NEW.exit_price) * NEW.quantity;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic P&L calculation
CREATE TRIGGER calculate_pnl_trigger
    BEFORE INSERT OR UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trade_pnl();

-- Function to update strategy performance metrics
CREATE OR REPLACE FUNCTION update_strategy_performance()
RETURNS TRIGGER AS $$
DECLARE
    strategy_record RECORD;
    virtual_pnl_total DECIMAL(12,2);
    live_pnl_total DECIMAL(12,2);
    virtual_trade_count INTEGER;
    live_trade_count INTEGER;
    win_count INTEGER;
    total_trades INTEGER;
    calculated_win_rate DECIMAL(5,2);
BEGIN
    -- Get strategy performance data
    SELECT 
        COALESCE(SUM(CASE WHEN trade_mode = 'VIRTUAL' AND pnl IS NOT NULL THEN pnl ELSE 0 END), 0) as v_pnl,
        COALESCE(SUM(CASE WHEN trade_mode = 'LIVE' AND pnl IS NOT NULL THEN pnl ELSE 0 END), 0) as l_pnl,
        COUNT(CASE WHEN trade_mode = 'VIRTUAL' THEN 1 END) as v_count,
        COUNT(CASE WHEN trade_mode = 'LIVE' THEN 1 END) as l_count,
        COUNT(CASE WHEN pnl > 0 THEN 1 END) as wins,
        COUNT(*) as total
    INTO virtual_pnl_total, live_pnl_total, virtual_trade_count, live_trade_count, win_count, total_trades
    FROM trades 
    WHERE strategy_id = NEW.strategy_id AND status = 'CLOSED';
    
    -- Calculate win rate
    calculated_win_rate = CASE 
        WHEN total_trades > 0 THEN (win_count::DECIMAL / total_trades::DECIMAL) * 100 
        ELSE 0 
    END;
    
    -- Update strategy performance metrics
    UPDATE strategies 
    SET 
        performance_metrics = jsonb_build_object(
            'virtual_pnl', virtual_pnl_total,
            'live_pnl', live_pnl_total,
            'virtual_trades', virtual_trade_count,
            'live_trades', live_trade_count,
            'win_rate', calculated_win_rate,
            'total_trades', total_trades,
            'last_updated', NOW()
        ),
        updated_at = NOW()
    WHERE id = NEW.strategy_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update strategy performance when trades change
CREATE TRIGGER update_strategy_perf_trigger
    AFTER INSERT OR UPDATE OR DELETE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_strategy_performance();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for multi-tenant support (if needed)
-- =============================================

-- Enable RLS on sensitive tables
-- ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment if authentication is implemented)
-- CREATE POLICY "Users can view their own strategies" ON strategies
--     FOR SELECT USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can insert their own strategies" ON strategies
--     FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- =============================================
-- INITIAL DATA AND CONSTRAINTS
-- =============================================

-- Note: Strategies should be created programmatically through the backend code
-- No default strategies are inserted to avoid mock data

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- Strategy performance summary view
CREATE OR REPLACE VIEW strategy_performance_summary AS
SELECT 
    s.id,
    s.name,
    s.strategy_type,
    s.is_simulation_active,
    s.is_live_mode,
    s.live_mode_enabled_at,
    (s.performance_metrics->>'virtual_pnl')::DECIMAL as virtual_pnl,
    (s.performance_metrics->>'live_pnl')::DECIMAL as live_pnl,
    (s.performance_metrics->>'virtual_trades')::INTEGER as virtual_trades,
    (s.performance_metrics->>'live_trades')::INTEGER as live_trades,
    (s.performance_metrics->>'win_rate')::DECIMAL as win_rate,
    s.created_at,
    s.updated_at
FROM strategies s;

-- Daily P&L summary view
CREATE OR REPLACE VIEW daily_pnl_summary AS
SELECT 
    DATE(t.entry_time) as trade_date,
    t.strategy_id,
    s.name as strategy_name,
    t.trade_mode,
    COUNT(*) as total_trades,
    SUM(t.pnl) as daily_pnl,
    COUNT(CASE WHEN t.pnl > 0 THEN 1 END) as winning_trades,
    COUNT(CASE WHEN t.pnl < 0 THEN 1 END) as losing_trades,
    AVG(t.pnl) as avg_pnl_per_trade
FROM trades t
JOIN strategies s ON s.id = t.strategy_id
WHERE t.status = 'CLOSED' AND t.pnl IS NOT NULL
GROUP BY DATE(t.entry_time), t.strategy_id, s.name, t.trade_mode
ORDER BY trade_date DESC, strategy_name;

-- Recent signals view
CREATE OR REPLACE VIEW recent_signals AS
SELECT 
    ts.id,
    ts.strategy_id,
    s.name as strategy_name,
    ts.symbol,
    ts.signal_type,
    ts.signal_strength,
    ts.price,
    ts.executed,
    ts.execution_mode,
    ts.timestamp,
    t.id as trade_id,
    t.pnl as trade_pnl
FROM trading_signals ts
JOIN strategies s ON s.id = ts.strategy_id
LEFT JOIN trades t ON t.id = ts.trade_id
ORDER BY ts.timestamp DESC;

-- =============================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Partitioning for large tables (example for trades)
-- CREATE TABLE trades_y2024m01 PARTITION OF trades 
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Regular maintenance (example)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE strategies IS 'Multi-strategy configuration and management';
COMMENT ON TABLE trades IS 'Combined virtual and live trade execution records';
COMMENT ON TABLE trading_signals IS 'Generated trading signals from all strategies';
COMMENT ON TABLE strategy_performance IS 'Daily performance metrics per strategy';
COMMENT ON TABLE live_mode_validations IS 'Validation logs before enabling live trading';
-- COMMENT ON TABLE emergency_stops IS 'Emergency stop event logs'; -- Table disabled
COMMENT ON TABLE ohlcv_data IS 'Multi-timeframe OHLCV data for technical analysis';
COMMENT ON TABLE market_feed IS 'Real-time tick data from DhanHQ WebSocket';
COMMENT ON TABLE instruments IS 'Available trading instruments and their properties';
COMMENT ON TABLE system_status IS 'System monitoring and health status tracking';

COMMENT ON COLUMN strategies.config IS 'JSON configuration for strategy parameters';
COMMENT ON COLUMN strategies.performance_metrics IS 'Cached performance data for quick access';
COMMENT ON COLUMN trades.trade_mode IS 'VIRTUAL for simulation, LIVE for real trading';
COMMENT ON COLUMN trades.dhanhq_order_id IS 'DhanHQ order ID for live trades only';
COMMENT ON COLUMN trading_signals.indicators IS 'Technical indicator values at signal generation';

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trading_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trading_app;