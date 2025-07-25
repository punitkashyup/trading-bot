'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MagicCard } from '@/components/magicui/magic-card'
import NumberTicker from '@/components/magicui/number-ticker'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Wifi, 
  WifiOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useRealTime } from '../hooks/useRealTime'

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

interface RealTimeFeedProps {
  symbols?: string[]
  maxItems?: number
}

export function RealTimeFeed({ symbols = [], maxItems = 50 }: RealTimeFeedProps) {
  const { 
    marketData, 
    isConnected, 
    connect, 
    disconnect, 
    subscribeToSymbol, 
    unsubscribeFromSymbol 
  } = useRealTime()
  
  const [isPaused, setIsPaused] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)

  // Subscribe to symbols when provided
  useEffect(() => {
    if (!isPaused && symbols.length > 0) {
      symbols.forEach(symbol => {
        subscribeToSymbol(symbol)
      })
    }
    
    return () => {
      if (symbols.length > 0) {
        symbols.forEach(symbol => {
          unsubscribeFromSymbol(symbol)
        })
      }
    }
  }, [symbols, isPaused, subscribeToSymbol, unsubscribeFromSymbol])

  // Audio alerts for large price movements
  useEffect(() => {
    if (audioEnabled && marketData.length > 0) {
      const latestData = marketData[0]
      if (Math.abs(latestData.change_percent) > 2) {
        console.log('🔊 Large price movement detected!', latestData.symbol, latestData.change_percent + '%')
      }
    }
  }, [marketData, audioEnabled])

  const handleTogglePause = () => {
    if (isPaused) {
      connect()
    } else {
      disconnect()
    }
    setIsPaused(!isPaused)
  }

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled)
  }

  const handleRefresh = () => {
    // Reconnect to refresh the feed
    disconnect()
    setTimeout(() => connect(), 1000)
  }

  const formatPrice = (price: number) => `₹${price.toFixed(2)}`
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`
    return volume.toString()
  }

  const getChangeColor = (change: number) => 
    change >= 0 ? 'text-green-600' : 'text-red-600'

  const getChangeIcon = (change: number) => 
    change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="h-full flex flex-col"
    >
      <MagicCard className="bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col" gradientColor="#f3f4f6" gradientOpacity={0.6}>
        <CardHeader className="pb-4 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center text-lg font-semibold">
              <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md mr-3">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="mr-2">Live Market Feed</span>
              <div className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'
              }`} />
            </CardTitle>
            
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleAudio}
                className={`h-8 w-8 p-0 ${audioEnabled ? 'text-green-600 hover:text-green-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant={isPaused ? "default" : "ghost"}
                onClick={handleTogglePause}
                className={isPaused ? "bg-green-600 hover:bg-green-700 text-white h-8 px-3" : "h-8 px-3 text-gray-500 hover:text-gray-700"}
              >
                {isPaused ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Pause
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-6 pb-6 flex-1 flex flex-col">
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {marketData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-base font-medium">
                    {isPaused ? 'Feed paused' : 'Waiting for market data...'}
                  </p>
                </div>
              ) : (
                marketData.map((data, index) => (
                  <motion.div
                    key={`${data.symbol}-${data.timestamp}-${index}`}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      type: "spring",
                      stiffness: 100
                    }}
                    className="bg-white hover:bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Single line layout */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs px-2 py-1 rounded font-semibold flex-shrink-0"
                        >
                          {data.symbol}
                        </Badge>

                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-gray-900 font-bold text-base">
                            {formatPrice(data.price)}
                          </span>

                          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded ${
                            data.change >= 0
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {getChangeIcon(data.change)}
                            <span className="text-xs font-semibold">
                              {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                            </span>
                            <span className="text-xs">
                              ({data.change_percent >= 0 ? '+' : ''}{data.change_percent.toFixed(2)}%)
                            </span>
                          </div>

                          <div className="hidden md:flex items-center space-x-3 text-xs text-gray-500 ml-auto">
                            <span>Vol: {formatVolume(data.volume)}</span>
                            <span>B/A: {formatPrice(data.bid)}/{formatPrice(data.ask)}</span>
                            <span>H/L: {formatPrice(data.high)}/{formatPrice(data.low)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 font-mono flex-shrink-0 ml-2">
                        {new Date(data.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${
                isConnected
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                <span className="text-sm font-semibold">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {isConnected ? 'DhanHQ WebSocket' : 'Connection Lost'}
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 font-medium">Updates:</span>
              <span className="text-sm font-bold text-gray-900">
                <NumberTicker value={marketData.length} />
              </span>
            </div>
          </div>
        </CardContent>
      </MagicCard>
    </motion.div>
  )
}