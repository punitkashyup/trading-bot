'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MagicCard } from '@/components/magicui/magic-card'
import { EmptyState, LoadingSkeleton } from '@/components/EmptyStates'
import { SimpleEmptyState } from '@/components/SimpleEmptyState'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Activity
} from 'lucide-react'
import { motion } from 'motion/react'

interface Trade {
  id: string
  strategy_id: string
  trade_mode: 'VIRTUAL' | 'LIVE'
  symbol: string
  trade_type: 'LONG' | 'SHORT'
  entry_time: string
  entry_price: number
  quantity: number
  exit_time?: string
  exit_price?: number
  exit_reason?: string
  pnl?: number
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  created_at: string
}

interface TradeTableProps {
  trades: Trade[]
  loading: boolean
}

export function TradeTable({ trades, loading }: TradeTableProps) {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'VIRTUAL' | 'LIVE'>('ALL')
  const [sortBy, setSortBy] = useState<'entry_time' | 'pnl' | 'symbol'>('entry_time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const filteredTrades = trades.filter(trade => {
    if (filter === 'ALL') return true
    if (filter === 'OPEN' || filter === 'CLOSED') return trade.status === filter
    if (filter === 'VIRTUAL' || filter === 'LIVE') return trade.trade_mode === filter
    return true
  })

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'entry_time':
        aValue = new Date(a.entry_time).getTime()
        bValue = new Date(b.entry_time).getTime()
        break
      case 'pnl':
        aValue = a.pnl || 0
        bValue = b.pnl || 0
        break
      case 'symbol':
        aValue = a.symbol
        bValue = b.symbol
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSort = (column: 'entry_time' | 'pnl' | 'symbol') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 border-2 border-blue-300 px-3 py-1 font-semibold'
      case 'CLOSED': return 'bg-green-100 text-green-800 border-2 border-green-300 px-3 py-1 font-semibold'
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-2 border-red-300 px-3 py-1 font-semibold'
      default: return 'bg-gray-100 text-gray-800 border-2 border-gray-300 px-3 py-1 font-semibold'
    }
  }

  const getTradeTypeColor = (type: string) => {
    return type === 'LONG' 
      ? 'bg-green-100 text-green-800 border-2 border-green-300 px-3 py-1 font-semibold' 
      : 'bg-red-100 text-red-800 border-2 border-red-300 px-3 py-1 font-semibold'
  }

  const getTradeModeColor = (mode: string) => {
    return mode === 'LIVE' 
      ? 'bg-orange-100 text-orange-800 border-2 border-orange-300 px-3 py-1 font-semibold' 
      : 'bg-purple-100 text-purple-800 border-2 border-purple-300 px-3 py-1 font-semibold'
  }

  if (loading) {
    return (
      <MagicCard className="bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg" gradientColor="#f3f4f6" gradientOpacity={0.5}>
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900 text-lg font-semibold flex items-center">
            <div className="h-6 w-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mr-3 flex items-center justify-center shadow-md">
              <Activity className="h-4 w-4 text-white" />
            </div>
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton type="list" />
        </CardContent>
      </MagicCard>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <MagicCard className="bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300" gradientColor="#f3f4f6" gradientOpacity={0.5}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 text-lg font-semibold flex items-center">
              <div className="h-6 w-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mr-3 flex items-center justify-center shadow-md">
                <Activity className="h-4 w-4 text-white" />
              </div>
              Recent Trades
            </CardTitle>
            
            {/* Filter Buttons */}
            <div className="flex items-center space-x-2">
              {['ALL', 'OPEN', 'CLOSED', 'VIRTUAL', 'LIVE'].map((filterOption) => (
                <Button
                  key={filterOption}
                  size="sm"
                  variant={filter === filterOption ? "default" : "ghost"}
                  onClick={() => setFilter(filterOption as any)}
                  className="text-xs"
                >
                  {filterOption}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {sortedTrades.length === 0 ? (
            <SimpleEmptyState type="trades" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Strategy</TableHead>
                    <TableHead className="text-white/70">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('symbol')}
                        className="text-white/70 hover:text-white p-0 h-auto"
                      >
                        Symbol
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-white/70">Type</TableHead>
                    <TableHead className="text-white/70">Mode</TableHead>
                    <TableHead className="text-white/70">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('entry_time')}
                        className="text-white/70 hover:text-white p-0 h-auto"
                      >
                        Entry Time
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-white/70 text-right">Entry Price</TableHead>
                    <TableHead className="text-white/70 text-right">Exit Price</TableHead>
                    <TableHead className="text-white/70">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('pnl')}
                        className="text-white/70 hover:text-white p-0 h-auto"
                      >
                        P&L
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTrades.slice(0, 20).map((trade, index) => (
                    <motion.tr
                      key={trade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="text-white/90 font-mono text-xs">
                        {trade.strategy_id.slice(-8)}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTradeTypeColor(trade.trade_type)}>
                          {trade.trade_type === 'LONG' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {trade.trade_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTradeModeColor(trade.trade_mode)}>
                          {trade.trade_mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/90 text-sm">
                        {formatDateTime(trade.entry_time)}
                      </TableCell>
                      <TableCell className="text-white/90 text-right font-mono">
                        ₹{trade.entry_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-white/90 text-right font-mono">
                        {trade.exit_price ? `₹${trade.exit_price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.pnl !== undefined && trade.pnl !== null ? (
                          <span className={`font-bold ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-white/50">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(trade.status)}>
                          {trade.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </MagicCard>
    </motion.div>
  )
}