'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MagicCard } from '@/components/magicui/magic-card'
import NumberTicker from '@/components/magicui/number-ticker'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { motion } from 'motion/react'

interface Strategy {
  id: string
  name: string
  strategy_type: string
  is_simulation_active: boolean
  is_live_mode: boolean
  performance_metrics: {
    virtual_pnl: number
    live_pnl: number
    virtual_trades: number
    live_trades: number
    win_rate: number
    total_trades: number
  }
  config: any
  created_at: string
  updated_at: string
}

interface StrategyCardProps {
  strategy: Strategy
  onUpdate: () => void
}

export function StrategyCard({ strategy, onUpdate }: StrategyCardProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [isEnablingLive, setIsEnablingLive] = useState(false)

  const metrics = strategy.performance_metrics || {
    virtual_pnl: 0,
    live_pnl: 0,
    virtual_trades: 0,
    live_trades: 0,
    win_rate: 0,
    total_trades: 0
  }

  const totalPnL = metrics.virtual_pnl + metrics.live_pnl
  const totalTrades = metrics.virtual_trades + metrics.live_trades

  const handleToggleSimulation = async () => {
    setIsToggling(true)
    try {
      const response = await fetch(`/api/strategies/toggle/${strategy.id}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to toggle strategy:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleToggleLiveMode = async () => {
    if (!strategy.is_live_mode && metrics.virtual_pnl <= 0) {
      alert('Strategy must have positive P&L before enabling live mode')
      return
    }

    if (!strategy.is_live_mode && metrics.virtual_trades < 10) {
      alert('Strategy must have at least 10 virtual trades before enabling live mode')
      return
    }

    const confirmed = window.confirm(
      strategy.is_live_mode 
        ? 'Are you sure you want to disable live trading for this strategy?'
        : 'Are you sure you want to enable live trading? This will place real orders with real money.'
    )

    if (!confirmed) return

    setIsEnablingLive(true)
    try {
      const response = await fetch(`/api/strategies/live-mode/${strategy.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enable: !strategy.is_live_mode }),
      })
      
      if (response.ok) {
        onUpdate()
      } else {
        const error = await response.json()
        alert(`Failed to toggle live mode: ${error.detail}`)
      }
    } catch (error) {
      console.error('Failed to toggle live mode:', error)
      alert('Failed to toggle live mode')
    } finally {
      setIsEnablingLive(false)
    }
  }

  const getStrategyTypeColor = (type: string) => {
    switch (type) {
      case 'PVA': return 'bg-purple-100 text-purple-800 border-2 border-purple-300 px-3 py-1 font-semibold'
      case 'MOMENTUM': return 'bg-blue-100 text-blue-800 border-2 border-blue-300 px-3 py-1 font-semibold'
      case 'MEAN_REVERSION': return 'bg-green-100 text-green-800 border-2 border-green-300 px-3 py-1 font-semibold'
      default: return 'bg-gray-100 text-gray-800 border-2 border-gray-300 px-3 py-1 font-semibold'
    }
  }

  const canEnableLiveMode = metrics.virtual_pnl > 0 && metrics.virtual_trades >= 10

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MagicCard className="bg-white/90 backdrop-blur-sm border border-gray-200/60 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1" gradientColor="#e5e7eb" gradientOpacity={0.4}>
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className={`h-4 w-4 rounded-full shadow-lg ${
                  strategy.is_live_mode
                    ? 'bg-orange-500 shadow-orange-500/50'
                    : strategy.is_simulation_active
                    ? 'bg-green-500 shadow-green-500/50'
                    : 'bg-gray-400'
                }`}
                animate={strategy.is_live_mode || strategy.is_simulation_active ? {
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <div>
                <CardTitle className="text-gray-900 text-xl font-bold mb-1">{strategy.name}</CardTitle>
                <p className="text-gray-500 text-sm">
                  {strategy.is_live_mode ? 'Live Trading' : strategy.is_simulation_active ? 'Virtual Trading' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <Badge className={getStrategyTypeColor(strategy.strategy_type)}>
                {strategy.strategy_type}
              </Badge>

              {strategy.is_live_mode && (
                <Badge className="bg-orange-100 text-orange-800 border-2 border-orange-300 px-3 py-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600 text-sm font-medium">Total P&L</span>
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹{totalPnL.toLocaleString()}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600 text-sm font-medium">Total Trades</span>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                <NumberTicker value={totalTrades} />
              </div>
            </div>
          </div>

          {/* Win Rate Progress */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 font-medium">Win Rate</span>
              <span className="text-gray-900 font-bold text-lg">
                <NumberTicker value={metrics.win_rate} decimalPlaces={1} />%
              </span>
            </div>
            <Progress
              value={metrics.win_rate}
              className="h-3 bg-gray-200"
            />
          </div>

          {/* Virtual vs Live Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <div className="text-blue-700 font-semibold text-sm">Virtual</div>
              </div>
              <div className="text-gray-900 font-bold text-lg">₹<NumberTicker value={metrics.virtual_pnl} /></div>
              <div className="text-gray-600 text-sm"><NumberTicker value={metrics.virtual_trades} /> trades</div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-2">
                <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                <div className="text-orange-700 font-semibold text-sm">Live</div>
              </div>
              <div className="text-gray-900 font-bold text-lg">₹<NumberTicker value={metrics.live_pnl} /></div>
              <div className="text-gray-600 text-sm"><NumberTicker value={metrics.live_trades} /> trades</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
                <Switch
                  checked={strategy.is_simulation_active}
                  onCheckedChange={handleToggleSimulation}
                  disabled={isToggling}
                />
                <span className="text-gray-700 text-sm font-semibold">
                  {strategy.is_simulation_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Live Mode Toggle */}
              <ShimmerButton
                className={`h-10 px-6 text-sm font-semibold rounded-lg transition-all ${
                  strategy.is_live_mode
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                    : canEnableLiveMode
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleToggleLiveMode}
                disabled={isEnablingLive || (!canEnableLiveMode && !strategy.is_live_mode)}
              >
                {isEnablingLive ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : strategy.is_live_mode ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Live
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Go Live
                  </>
                )}
              </ShimmerButton>

              {/* Settings Button */}
              <Button size="sm" variant="ghost" className="h-10 w-10 p-0 hover:bg-gray-100">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Live Mode Validation Status */}
          {!strategy.is_live_mode && (
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1">
                {metrics.virtual_pnl > 0 ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                )}
                <span className={metrics.virtual_pnl > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  Positive P&L
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                {metrics.virtual_trades >= 10 ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                )}
                <span className={metrics.virtual_trades >= 10 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  <NumberTicker value={metrics.virtual_trades} />/10 trades
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </MagicCard>
    </motion.div>
  )
}