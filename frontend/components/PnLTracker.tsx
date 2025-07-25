'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MagicCard } from '@/components/magicui/magic-card'
import NumberTicker from '@/components/magicui/number-ticker'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { motion } from 'motion/react'

interface PnLDataPoint {
  date: string
  virtual_pnl: number
  live_pnl: number
  total_pnl: number
  virtual_trades: number
  live_trades: number
  cumulative_pnl: number
}

interface PnLTrackerProps {
  data: PnLDataPoint[]
}

export function PnLTracker({ data }: PnLTrackerProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | 'ALL'>('7D')
  const [view, setView] = useState<'line' | 'area' | 'bar'>('area')

  // Process data for cumulative P&L
  const processedData = data.map((item, index) => {
    const cumulativePnL = data.slice(0, index + 1).reduce((sum, d) => sum + d.total_pnl, 0)
    return {
      ...item,
      cumulative_pnl: cumulativePnL,
      formatted_date: new Date(item.date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric'
      })
    }
  })

  // Filter data based on timeframe
  const getFilteredData = () => {
    const now = new Date()
    let cutoffDate = new Date()

    switch (timeframe) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1)
        break
      case '7D':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '30D':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case 'ALL':
        return processedData
    }

    return processedData.filter(item => new Date(item.date) >= cutoffDate)
  }

  const filteredData = getFilteredData()

  // Calculate summary statistics
  const totalPnL = filteredData.reduce((sum, item) => sum + item.total_pnl, 0)
  const totalVirtualPnL = filteredData.reduce((sum, item) => sum + item.virtual_pnl, 0)
  const totalLivePnL = filteredData.reduce((sum, item) => sum + item.live_pnl, 0)
  const totalTrades = filteredData.reduce((sum, item) => sum + item.virtual_trades + item.live_trades, 0)
  
  const bestDay = filteredData.reduce((max, item) => 
    item.total_pnl > max.total_pnl ? item : max, 
    filteredData[0] || { total_pnl: 0, date: '' }
  )
  
  const worstDay = filteredData.reduce((min, item) => 
    item.total_pnl < min.total_pnl ? item : min, 
    filteredData[0] || { total_pnl: 0, date: '' }
  )

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white backdrop-blur-sm border border-gray-300 rounded-lg p-3 shadow-xl">
          <p className="text-gray-900 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-700 text-sm">{entry.name}:</span>
              </div>
              <span className={`font-bold ${
                entry.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹{entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    }

    switch (view) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="formatted_date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="cumulative_pnl" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
              name="Cumulative P&L"
            />
            <Line 
              type="monotone" 
              dataKey="virtual_pnl" 
              stroke="#06B6D4" 
              strokeWidth={2}
              dot={{ fill: "#06B6D4", strokeWidth: 2, r: 3 }}
              name="Virtual P&L"
            />
            <Line 
              type="monotone" 
              dataKey="live_pnl" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={{ fill: "#F59E0B", strokeWidth: 2, r: 3 }}
              name="Live P&L"
            />
          </LineChart>
        )
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="cumulativePnL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="formatted_date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="cumulative_pnl" 
              stroke="#8B5CF6" 
              fillOpacity={1}
              fill="url(#cumulativePnL)"
              strokeWidth={2}
              name="Cumulative P&L"
            />
          </AreaChart>
        )
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="formatted_date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="virtual_pnl" 
              fill="#06B6D4" 
              name="Virtual P&L"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="live_pnl" 
              fill="#F59E0B" 
              name="Live P&L"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-full flex flex-col"
    >
      <MagicCard className="bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col" gradientColor="#f3f4f6" gradientOpacity={0.5}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center space-x-3 text-lg font-semibold">
              <div className="h-6 w-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span>P&L Analytics</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Chart Type Selector */}
              <div className="flex items-center space-x-1">
                {['line', 'area', 'bar'].map((chartType) => (
                  <Button
                    key={chartType}
                    size="sm"
                    variant={view === chartType ? "default" : "ghost"}
                    onClick={() => setView(chartType as any)}
                    className="text-xs capitalize"
                  >
                    {chartType}
                  </Button>
                ))}
              </div>
              
              {/* Timeframe Selector */}
              <div className="flex items-center space-x-1">
                {['1D', '7D', '30D', 'ALL'].map((tf) => (
                  <Button
                    key={tf}
                    size="sm"
                    variant={timeframe === tf ? "default" : "ghost"}
                    onClick={() => setTimeframe(tf as any)}
                    className="text-xs"
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 flex flex-col">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs font-medium">Total P&L</span>
                {totalPnL >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
              </div>
              <div className={`text-lg font-bold ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹<NumberTicker value={totalPnL} />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs font-medium">Virtual P&L</span>
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <div className={`text-lg font-bold ${
                totalVirtualPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹<NumberTicker value={totalVirtualPnL} />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs font-medium">Live P&L</span>
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              </div>
              <div className={`text-lg font-bold ${
                totalLivePnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹<NumberTicker value={totalLivePnL} />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs font-medium">Total Trades</span>
                <Calendar className="h-3 w-3 text-purple-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                <NumberTicker value={totalTrades} />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0">
            {filteredData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No P&L data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Best/Worst Day Stats */}
          {filteredData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600 font-semibold text-sm">Best Day</span>
                </div>
                <div className="text-gray-900 font-bold text-base">
                  ₹<NumberTicker value={bestDay.total_pnl} />
                </div>
                <div className="text-gray-600 text-xs">
                  {new Date(bestDay.date).toLocaleDateString('en-IN')}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600 font-semibold text-sm">Worst Day</span>
                </div>
                <div className="text-gray-900 font-bold text-base">
                  ₹<NumberTicker value={worstDay.total_pnl} />
                </div>
                <div className="text-gray-600 text-xs">
                  {new Date(worstDay.date).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </MagicCard>
    </motion.div>
  )
}