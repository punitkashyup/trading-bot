'use client'

import { useState, useEffect, useCallback } from 'react'

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

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/trades')
      if (!response.ok) {
        if (response.status === 503) {
          const errorData = await response.json()
          if (errorData.code === 'BACKEND_OFFLINE') {
            setError('ECONNREFUSED')
            setTrades([])
            return
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setTrades(data)
    } catch (err) {
      console.error('Failed to fetch trades:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(() => {
    fetchTrades()
  }, [fetchTrades])

  const getTradesByStrategy = useCallback((strategyId: string) => {
    return trades.filter(trade => trade.strategy_id === strategyId)
  }, [trades])

  const getOpenTrades = useCallback(() => {
    return trades.filter(trade => trade.status === 'OPEN')
  }, [trades])

  const getClosedTrades = useCallback(() => {
    return trades.filter(trade => trade.status === 'CLOSED')
  }, [trades])

  const getLiveTrades = useCallback(() => {
    return trades.filter(trade => trade.trade_mode === 'LIVE')
  }, [trades])

  const getVirtualTrades = useCallback(() => {
    return trades.filter(trade => trade.trade_mode === 'VIRTUAL')
  }, [trades])

  useEffect(() => {
    fetchTrades()
    
    // Set up WebSocket connection for real-time trade updates
    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    const ws = new WebSocket(`${WS_BASE_URL}/ws/trades`)
    
    ws.onopen = () => {
      console.log('Connected to trades WebSocket')
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'trade_update') {
          const tradeUpdate = message.data
          setTrades(prev => {
            const existingIndex = prev.findIndex(t => t.id === tradeUpdate.id)
            if (existingIndex >= 0) {
              // Update existing trade
              const updated = [...prev]
              updated[existingIndex] = tradeUpdate
              return updated
            } else {
              // Add new trade
              return [tradeUpdate, ...prev]
            }
          })
        }
      } catch (error) {
        console.error('Error parsing trade update:', error)
      }
    }
    
    ws.onclose = (event) => {
      console.log('Trades WebSocket disconnected', event.code, event.reason)
    }
    
    ws.onerror = (error) => {
      console.warn('Trades WebSocket connection failed - backend may be offline')
    }
    
    return () => {
      ws.close()
    }
  }, [fetchTrades])

  return {
    trades,
    loading,
    error,
    refetch,
    getTradesByStrategy,
    getOpenTrades,
    getClosedTrades,
    getLiveTrades,
    getVirtualTrades
  }
}