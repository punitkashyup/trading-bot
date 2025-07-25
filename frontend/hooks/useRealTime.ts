'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface MarketData {
  symbol: string
  price: number
  change: number
  change_percent: number
  volume: number
  timestamp: string
  bid: number
  ask: number
  high: number
  low: number
  open: number
}

interface SystemStatus {
  status: 'NORMAL' | 'WARNING' | 'EMERGENCY' | 'STOPPED'
  websocket_connected: boolean
  active_strategies: number
  live_positions: number
  last_update: string
}

export function useRealTime() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'NORMAL',
    websocket_connected: false,
    active_strategies: 0,
    live_positions: 0,
    last_update: new Date().toISOString()
  })
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    // Don't connect if already connecting/connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return
    }
    
    try {
      // Get WebSocket URL from environment
      const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
      
      // Connect to market data WebSocket
      const marketDataWs = new WebSocket(`${WS_BASE_URL}/ws/market-data`)
      const systemStatusWs = new WebSocket(`${WS_BASE_URL}/ws/system-status`)
      
      wsRef.current = marketDataWs
      
      // Market data WebSocket handlers
      marketDataWs.onopen = () => {
        console.log('Connected to market data feed')
        setIsConnected(true)
      }
      
      marketDataWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'market_data') {
            const newData: MarketData = {
              symbol: message.data.symbol || 'UNKNOWN',
              price: message.data.ltp || 0,
              change: message.data.change || 0,
              change_percent: message.data.change_percent || 0,
              volume: message.data.volume || 0,
              timestamp: message.data.timestamp || new Date().toISOString(),
              bid: message.data.bid || message.data.ltp || 0,
              ask: message.data.ask || message.data.ltp || 0,
              high: message.data.high || message.data.ltp || 0,
              low: message.data.low || message.data.ltp || 0,
              open: message.data.open || message.data.ltp || 0
            }
            
            setMarketData(prev => [newData, ...prev.slice(0, 49)])
          }
        } catch (error) {
          console.error('Error parsing market data message:', error)
        }
      }
      
      marketDataWs.onclose = (event) => {
        console.log('Market data feed disconnected', event.code, event.reason)
        setIsConnected(false)
        
        // Auto-reconnect after 5 seconds if not a manual close
        if (event.code !== 1000 && event.code !== 1001) {
          setTimeout(() => {
            console.log('Attempting to reconnect to market data...')
            connect()
          }, 5000)
        }
      }
      
      marketDataWs.onerror = (error) => {
        console.warn('Market data WebSocket connection failed - backend may be offline')
        setIsConnected(false)
      }
      
      // System status WebSocket handlers
      systemStatusWs.onopen = () => {
        console.log('Connected to system status feed')
      }
      
      systemStatusWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'system_status') {
            setSystemStatus(prev => ({
              ...prev,
              websocket_connected: message.data.websocket_connected || false,
              active_strategies: message.data.active_strategies || prev.active_strategies,
              live_positions: message.data.live_positions || prev.live_positions,
              last_update: new Date().toISOString()
            }))
          }
        } catch (error) {
          console.error('Error parsing system status message:', error)
        }
      }
      
      systemStatusWs.onclose = (event) => {
        console.log('System status feed disconnected', event.code, event.reason)
        setSystemStatus(prev => ({ ...prev, websocket_connected: false }))
      }
      
      systemStatusWs.onerror = (error) => {
        console.warn('System status WebSocket connection failed - backend may be offline')
      }
      
      // Cleanup function
      return () => {
        marketDataWs.close()
        systemStatusWs.close()
        setIsConnected(false)
        setSystemStatus(prev => ({ ...prev, websocket_connected: false }))
      }
    } catch (error) {
      console.warn('Failed to initialize WebSocket connections - backend may be offline')
      setIsConnected(false)
      setSystemStatus(prev => ({ ...prev, websocket_connected: false }))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setIsConnected(false)
    setSystemStatus(prev => ({ ...prev, websocket_connected: false }))
  }, [])

  const subscribeToSymbol = useCallback((symbol: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbol: symbol
      }))
    }
    console.log(`Subscribing to ${symbol}`)
  }, [])

  const unsubscribeFromSymbol = useCallback((symbol: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'unsubscribe',
        symbol: symbol
      }))
    }
    console.log(`Unsubscribing from ${symbol}`)
  }, [])


  const getLatestPrice = useCallback((symbol: string): MarketData | null => {
    const symbolData = marketData.filter(data => data.symbol === symbol)
    return symbolData.length > 0 ? symbolData[0] : null
  }, [marketData])

  const getSymbolHistory = useCallback((symbol: string, limit: number = 10): MarketData[] => {
    return marketData
      .filter(data => data.symbol === symbol)
      .slice(0, limit)
  }, [marketData])

  useEffect(() => {
    const cleanup = connect()
    
    return () => {
      if (cleanup) cleanup()
      disconnect()
    }
  }, [connect, disconnect])

  return {
    marketData,
    systemStatus,
    isConnected,
    connect,
    disconnect,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    getLatestPrice,
    getSymbolHistory
  }
}