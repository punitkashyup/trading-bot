'use client'

import { useState, useEffect } from 'react'
import { StrategyCard } from '@/components/StrategyCard'
import { TradeTable } from '@/components/TradeTable'
import { PnLTracker } from '@/components/PnLTracker'
import { RealTimeFeed } from '@/components/RealTimeFeed'
import { BackendOfflineError } from '@/components/BackendOfflineError'
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { motion } from 'motion/react'
import NumberTicker from '@/components/magicui/number-ticker'
import { MagicCard } from '@/components/magicui/magic-card'
import { EmptyState, LoadingSkeleton } from '@/components/EmptyStates'
import { SimpleEmptyState } from '@/components/SimpleEmptyState'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { useStrategies } from '@/hooks/useStrategies'
import { useTrades } from '@/hooks/useTrades'
import { useDashboard } from '@/hooks/useDashboard'
import { useRealTime } from '@/hooks/useRealTime'

export default function Dashboard() {
  const { strategies, loading: strategiesLoading, error: strategiesError, refetch: refetchStrategies } = useStrategies()
  const { trades, loading: tradesLoading, error: tradesError } = useTrades()
  const { dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboard()
  const { systemStatus } = useRealTime()

  // Check if backend is offline
  const isBackendOffline = strategiesError?.includes('ECONNREFUSED') || 
                          tradesError?.includes('ECONNREFUSED') || 
                          dashboardError?.includes('ECONNREFUSED')

  const totalPnL = dashboardData?.total_pnl || 0
  const totalTrades = dashboardData?.total_trades || 0
  const activeStrategies = strategies?.filter(s => s.is_simulation_active).length || 0
  const liveStrategies = strategies?.filter(s => s.is_live_mode).length || 0

  const handleRetryConnection = () => {
    refetchStrategies()
    window.location.reload()
  }

  // Show backend offline error if detected
  if (isBackendOffline) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b-2 border-gray-200 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
                <p className="text-lg text-gray-600">Live Market Strategy Simulator</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <BackendOfflineError onRetry={handleRetryConnection} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full relative bg-white">
      {/* Cool Blue Glow Left */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#ffffff",
          backgroundImage: `
            radial-gradient(
              circle at top left,
              rgba(70, 130, 180, 0.5),
              transparent 70%
            )
          `,
          filter: "blur(80px)",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Header */}
      <header className="relative z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Trading Dashboard</h1>
                <p className="text-xs text-gray-500">Live Market Strategy Simulator</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <ConnectionStatus 
                isConnected={systemStatus.websocket_connected} 
                onRetry={handleRetryConnection}
              />
              
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
            <MagicCard className="bg-white/90 backdrop-blur-sm border border-gray-200/60 p-4 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex items-center" gradientColor="#f3f4f6" gradientOpacity={0.4}>
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total P&L</p>
                  <p className={`text-xl font-bold mt-1 ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹<NumberTicker value={totalPnL} />
                  </p>
                </div>
                <motion.div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 ml-3 ${totalPnL >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}
                  whileHover={{ rotate: 5 }}
                >
                  <TrendingUp className="h-5 w-5 text-white" />
                </motion.div>
              </div>
            </MagicCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
            <MagicCard className="bg-white/90 backdrop-blur-sm border border-gray-200/60 p-4 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex items-center" gradientColor="#f3f4f6" gradientOpacity={0.4}>
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Trades</p>
                  <p className="text-xl font-bold text-gray-900 mt-1"><NumberTicker value={totalTrades} /></p>
                </div>
                <motion.div
                  className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 ml-3"
                  whileHover={{ rotate: 5 }}
                >
                  <Activity className="h-5 w-5 text-white" />
                </motion.div>
              </div>
            </MagicCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
            <MagicCard className="bg-white/90 backdrop-blur-sm border border-gray-200/60 p-4 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex items-center" gradientColor="#f3f4f6" gradientOpacity={0.4}>
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Active Strategies</p>
                  <p className="text-xl font-bold text-gray-900 mt-1"><NumberTicker value={activeStrategies} /></p>
                </div>
                <motion.div
                  className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 ml-3"
                  whileHover={{ rotate: 5 }}
                >
                  <Activity className="h-5 w-5 text-white" />
                </motion.div>
              </div>
            </MagicCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
            <MagicCard className="bg-white/90 backdrop-blur-sm border border-gray-200/60 p-4 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex items-center" gradientColor="#f3f4f6" gradientOpacity={0.4}>
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Live Strategies</p>
                  <p className="text-xl font-bold text-gray-900 mt-1"><NumberTicker value={liveStrategies} /></p>
                </div>
                <motion.div
                  className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 ml-3"
                  whileHover={{ rotate: 5 }}
                >
                  <AlertTriangle className="h-5 w-5 text-white" />
                </motion.div>
              </div>
            </MagicCard>
          </motion.div>
        </div>

        {/* Strategy Management & Real-time Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Strategies */}
          <div className="xl:col-span-2 flex flex-col">
            <MagicCard className="bg-white/95 backdrop-blur-sm border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex-1 flex flex-col" gradientColor="#f3f4f6" gradientOpacity={0.5}>
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center flex-shrink-0">
                <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mr-3 flex items-center justify-center shadow-md">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                Strategy Management
              </h2>

              <div className="flex-1 flex flex-col">
                {strategiesLoading ? (
                  <LoadingSkeleton type="card" />
                ) : strategies && strategies.length > 0 ? (
                  <div className="space-y-6 flex-1">
                    {strategies.map((strategy) => (
                      <StrategyCard
                        key={strategy.id}
                        strategy={strategy}
                        onUpdate={refetchStrategies}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <SimpleEmptyState type="strategies" />
                  </div>
                )}
              </div>
            </MagicCard>
          </div>

          {/* Real-time Market Feed */}
          <div className="flex flex-col">
            <div className="flex-1">
              <RealTimeFeed />
            </div>
          </div>
        </div>

        {/* P&L Tracker and Trade Table */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* P&L Tracker */}
          <div className="flex flex-col">
            <PnLTracker data={(dashboardData?.daily_pnl || []).map((item, index, arr) => ({
              ...item,
              cumulative_pnl: arr.slice(0, index + 1).reduce((sum, d) => sum + d.total_pnl, 0)
            }))} />
          </div>

          {/* Recent Trades */}
          <div className="flex flex-col">
            <TradeTable trades={trades || []} loading={tradesLoading} />
          </div>
        </div>
      </main>
    </div>
  )
}