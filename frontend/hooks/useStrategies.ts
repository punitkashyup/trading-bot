'use client'

import { useState, useEffect, useCallback } from 'react'

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

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/strategies')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setStrategies(data)
    } catch (err) {
      console.error('Failed to fetch strategies:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch strategies')
      setStrategies([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(() => {
    fetchStrategies()
  }, [fetchStrategies])


  const toggleStrategy = useCallback(async (strategyId: string) => {
    try {
      const response = await fetch(`/api/strategies/toggle/${strategyId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await refetch()
    } catch (err) {
      console.error('Failed to toggle strategy:', err)
      throw err
    }
  }, [refetch])

  const toggleLiveMode = useCallback(async (strategyId: string, enable: boolean) => {
    try {
      const response = await fetch(`/api/strategies/live-mode/${strategyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enable }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || `HTTP error! status: ${response.status}`)
      }

      await refetch()
    } catch (err) {
      console.error('Failed to toggle live mode:', err)
      throw err
    }
  }, [refetch])

  useEffect(() => {
    fetchStrategies()
  }, [fetchStrategies])

  return {
    strategies,
    loading,
    error,
    refetch,
    toggleStrategy,
    toggleLiveMode
  }
}