# Live Market Strategy Simulator

A comprehensive multi-strategy trading simulator with live mode capabilities, built with FastAPI, Next.js 15, Supabase, and DhanHQ integration.

## 🎯 Project Overview

This platform provides a sophisticated trading strategy simulator that allows users to:

- **Virtual Trading**: Test strategies with live market data without risk
- **Live Trading**: Deploy validated strategies with real money (user-enabled per strategy)
- **Multi-Strategy Support**: Run multiple strategies simultaneously with independent configurations
- **Real-Time Data**: Live market feed from DhanHQ WebSocket API
- **Advanced Analytics**: Comprehensive P&L tracking and performance metrics

## 🏗️ Architecture

### Backend (FastAPI + Python 3.12)
- **Real-time WebSocket Integration**: DhanHQ live market data
- **Multi-Strategy Engine**: Pluggable strategy architecture
- **Technical Analysis**: TA-Lib integration for advanced indicators
- **Risk Management**: Per-strategy position sizing and stop-losses
- **Database**: Supabase with real-time subscriptions

### Frontend (Next.js 15 + Magic UI)
- **Real-time Dashboard**: Live strategy monitoring and control
- **Strategy Management**: Toggle simulation/live mode per strategy
- **Performance Tracking**: Interactive charts and analytics
- **Magic UI Components**: Professional trading interface

### Database (Supabase)
- **Multi-strategy Schema**: Isolated strategy configurations
- **Real-time Subscriptions**: Live updates for trades and signals
- **Performance Tracking**: Historical P&L and metrics storage

## 🚀 Key Features

### 1. Price Volume Action (PVA) Strategy
Complete implementation with exact specifications:

**Technical Indicators**:
- On-Balance Volume (OBV)
- Volume Rate of Change (VROC)
- Accumulation/Distribution Line
- Volume Weighted Average Price (VWAP)
- Volume Profile with Point of Control (POC)
- Value Area High/Low calculations

**Entry Criteria**:
- **LONG**: Price breaks above resistance with volume > 150% of average, OBV positive divergence, buying above POC, VROC > 200%, price above VWAP
- **SHORT**: Price breaks below support with volume > 150% of average, OBV negative divergence, selling below POC, VROC > 200%, price below VWAP

**Exit Criteria**:
- Volume climax (VROC > 300%)
- Price hits 2x ATR target
- Volume drops below 80% of entry volume
- Time-based EOD exit at 3:15 PM

**Risk Management**:
- Max position size: 2% of capital
- Position sizing based on VROC strength
- Max 3 open trades simultaneously
- Max daily loss: 6%
- 30-minute re-entry cooldown

### 2. Live Mode Functionality

**Validation Requirements**:
- Positive simulation P&L
- Minimum 10 successful virtual trades
- User confirmation modal
- Real-time risk monitoring

**Safety Features**:
- Emergency stop functionality
- Circuit breakers for risk management
- Real-time position monitoring
- Automatic EOD exits

### 3. Real-Time Data Processing
- DhanHQ WebSocket integration
- Multi-timeframe OHLCV construction (1min, 5min, 15min, daily)
- Connection management with auto-reconnection
- Data validation and error handling

## 📊 Dashboard Features

### Strategy Management
- Create and configure multiple strategies
- Toggle simulation mode per strategy
- Enable/disable live mode with validation
- Real-time performance monitoring

### Trading Interface
- Live market data feed
- Real-time trade updates
- P&L tracking with animated counters
- Strategy performance charts

### Risk Controls
- Emergency stop for all strategies
- Live mode validation system
- Real-time risk monitoring
- Automatic position management

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance async web framework
- **Python 3.12**: Latest Python with enhanced performance
- **TA-Lib**: Professional technical analysis library
- **WebSockets**: Real-time data streaming
- **Supabase**: Real-time database with subscriptions

### Frontend
- **Next.js 15**: React framework with App Router
- **Magic UI**: Professional UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations
- **React Query**: Data fetching and caching

### Infrastructure
- **Supabase**: PostgreSQL with real-time capabilities
- **DhanHQ API**: Live market data and order execution
- **WebSocket**: Real-time communication

## 📁 Project Structure

```
asha-trading-bot/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/          # API route handlers
│   │   ├── core/
│   │   │   ├── strategies/         # Strategy implementations
│   │   │   └── market_data/        # Market data handling
│   │   ├── services/               # External service integrations
│   │   └── main.py                 # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── app/                        # Next.js 15 App Router
│   ├── components/                 # React components
│   ├── hooks/                      # Custom React hooks
│   └── package.json
├── database/
│   └── schema.sql                  # Supabase database schema
└── README.md
```

## 🔧 Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+
- Supabase account
- DhanHQ API credentials

### Backend Setup
1. **Install Python dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   export SUPABASE_URL="your_supabase_url"
   export SUPABASE_ANON_KEY="your_supabase_anon_key"
   export DHANHQ_CLIENT_ID="your_dhanhq_client_id"
   export DHANHQ_ACCESS_TOKEN="your_dhanhq_access_token"
   ```

3. **Run the FastAPI server**:
   ```bash
   python -m app.main
   ```

### Frontend Setup
1. **Install Node.js dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set environment variables**:
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

### Database Setup
1. **Create Supabase project**
2. **Run the database schema**:
   ```sql
   -- Execute the contents of database/schema.sql in Supabase SQL editor
   ```

## 📈 API Endpoints

### Strategy Management
- `GET /api/strategies/list` - List all strategies
- `POST /api/strategies/create` - Create new strategy
- `POST /api/strategies/toggle/{strategy_id}` - Toggle simulation mode
- `POST /api/strategies/live-mode/{strategy_id}` - Toggle live mode
- `GET /api/strategies/summary` - Get strategies summary
- `GET /api/strategies/{strategy_id}/performance` - Get strategy performance

### Trade Management
- `GET /api/trades/all` - List all trades
- `GET /api/trades/virtual/{strategy_id}` - Virtual trades for strategy
- `GET /api/trades/live/{strategy_id}` - Live trades for strategy

### Live Trading
- `POST /api/live-trading/validate/{strategy_id}` - Validate for live mode
- `POST /api/live-trading/enable/{strategy_id}` - Enable live trading
- `POST /api/live-trading/emergency-stop` - Emergency stop all strategies

### Dashboard
- `GET /api/dashboard/pnl` - Cumulative P&L data
- `GET /api/dashboard/pnl/{strategy_id}` - Strategy-specific P&L

## 🔒 Security Features

- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Graceful error management
- **Rate Limiting**: API rate limiting protection
- **Real-time Monitoring**: Live system health monitoring

## 📊 Performance Optimizations

- **Database Indexing**: Optimized queries for real-time performance
- **Connection Pooling**: Efficient database connections
- **Caching**: Strategic data caching for speed
- **Async Processing**: Non-blocking operations
- **Real-time Updates**: WebSocket-based live updates

## 🚨 Risk Management

### Strategy-Level Controls
- Position size limits (2% of capital)
- Maximum open positions (3 per strategy)
- Daily loss limits (6% maximum)
- Stop-loss and target management

### System-Level Controls
- Emergency stop functionality
- Real-time risk monitoring
- Automatic EOD exits
- Circuit breakers

### Live Mode Validation
- Minimum performance requirements
- Trade count validation
- User confirmation system
- Real-time validation monitoring

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- Additional strategy types (Momentum, Mean Reversion, Arbitrage)
- Advanced risk analytics
- Portfolio optimization
- Machine learning integration
- Mobile application
- Advanced charting capabilities

---

**⚠️ Disclaimer**: This is a trading simulator for educational and testing purposes. Live trading involves significant financial risk. Users are responsible for their own trading decisions and should consult with financial advisors before live trading.