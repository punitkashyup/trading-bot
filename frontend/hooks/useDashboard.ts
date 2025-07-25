'use client'

import { useState, useEffect, useCallback } from 'react'

interface DashboardData {
  total_strategies: number
  active_strategies: number
  live_strategies: number
  total_pnl: number
  virtual_pnl: number
  live_pnl: number
  total_trades: number
  open_positions: number
  win_rate: number
  daily_pnl: Array<{
    date: string
    virtual_pnl: number
    live_pnl: number
    total_pnl: number
    virtual_trades: number
    live_trades: number
  }>
  recent_alerts: Array<{
    id: string
    type: 'INFO' | 'WARNING' | 'ERROR'
    message: string
    timestamp: string
  }>
}

export function useDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    fetchDashboardData()
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return {
    dashboardData,
    loading,
    error,
    refetch
  }
}