-- =============================================
-- Migration: Add Missing Tables
-- Date: 2024-01-24
-- Description: Add instruments and system_status tables that are referenced in the code
-- =============================================

-- =============================================
-- INSTRUMENTS TABLE
-- Available trading instruments
-- =============================================
CREATE TABLE IF NOT EXISTS instruments (
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
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_exchange ON instruments(exchange);
CREATE INDEX IF NOT EXISTS idx_instruments_type ON instruments(instrument_type);
CREATE INDEX IF NOT EXISTS idx_instruments_active ON instruments(is_active);

-- =============================================
-- SYSTEM STATUS TABLE
-- System monitoring and health status
-- =============================================
CREATE TABLE IF NOT EXISTS system_status (
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
CREATE INDEX IF NOT EXISTS idx_system_status_updated ON system_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_status_status ON system_status(status);

-- =============================================
-- TRIGGERS FOR NEW TABLES
-- =============================================

-- Function to update updated_at timestamp (should already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for instruments table
DROP TRIGGER IF EXISTS update_instruments_updated_at ON instruments;
CREATE TRIGGER update_instruments_updated_at 
    BEFORE UPDATE ON instruments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for system_status table
DROP TRIGGER IF EXISTS update_system_status_updated_at ON system_status;
CREATE TRIGGER update_system_status_updated_at 
    BEFORE UPDATE ON system_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE COMMENTS
-- =============================================
COMMENT ON TABLE instruments IS 'Available trading instruments and their properties';
COMMENT ON TABLE system_status IS 'System monitoring and health status tracking';

-- =============================================
-- REFERENCE DATA (OPTIONAL - REMOVE IF NOT NEEDED)
-- =============================================

-- Uncomment below to insert common Indian market instruments
-- These are legitimate trading instruments, not mock data
/*
INSERT INTO instruments (symbol, name, exchange, instrument_type, lot_size, tick_size) VALUES
('NIFTY', 'Nifty 50 Index', 'NSE', 'DERIVATIVE', 25, 0.05),
('BANKNIFTY', 'Bank Nifty Index', 'NSE', 'DERIVATIVE', 15, 0.05),
('RELIANCE', 'Reliance Industries Limited', 'NSE', 'EQUITY', 1, 0.05),
('TCS', 'Tata Consultancy Services Limited', 'NSE', 'EQUITY', 1, 0.05),
('HDFCBANK', 'HDFC Bank Limited', 'NSE', 'EQUITY', 1, 0.05),
('INFY', 'Infosys Limited', 'NSE', 'EQUITY', 1, 0.05),
('ITC', 'ITC Limited', 'NSE', 'EQUITY', 1, 0.05),
('HINDUNILVR', 'Hindustan Unilever Limited', 'NSE', 'EQUITY', 1, 0.05),
('ICICIBANK', 'ICICI Bank Limited', 'NSE', 'EQUITY', 1, 0.05),
('KOTAKBANK', 'Kotak Mahindra Bank Limited', 'NSE', 'EQUITY', 1, 0.05)
ON CONFLICT (symbol) DO NOTHING;
*/

-- Uncomment below to insert initial system status
/*
INSERT INTO system_status (status, websocket_connected, active_strategies, live_positions, message) VALUES
('active', false, 0, 0, 'System initialized')
ON CONFLICT DO NOTHING;
*/