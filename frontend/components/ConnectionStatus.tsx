'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, Server, AlertCircle, CheckCircle, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ConnectionStatusProps {
  isConnected: boolean
  onRetry?: () => void
}

export function ConnectionStatus({ isConnected, onRetry }: ConnectionStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const statusConfig = isConnected
    ? {
        icon: CheckCircle,
        color: 'bg-green-500',
        shadowColor: 'shadow-green-500/30',
        text: 'Connected',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        tooltip: 'Successfully connected to FastAPI backend'
      }
    : {
        icon: AlertCircle,
        color: 'bg-amber-500',
        shadowColor: 'shadow-amber-500/30',
        text: 'Disconnected',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        tooltip: 'Backend not connected. Start your FastAPI backend on port 8000'
      }

  const StatusIcon = statusConfig.icon

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center space-x-3 px-4 py-2 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg`}
            onClick={() => !isConnected && onRetry?.()}
          >
            {/* Animated Status Dot */}
            <motion.div className="relative">
              <div
                className={`h-2.5 w-2.5 rounded-full ${statusConfig.color} shadow-lg ${statusConfig.shadowColor}`}
              >
                {isConnected && (
                  <motion.div
                    className={`absolute inset-0 rounded-full ${statusConfig.color}`}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>
            </motion.div>

            {/* Status Text */}
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-4 w-4 ${statusConfig.textColor}`} />
              <span className={`text-sm font-medium ${statusConfig.textColor}`}>
                {statusConfig.text}
              </span>
            </div>

            {/* Pulse Animation for Disconnected State */}
            {!isConnected && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs text-amber-600"
              >
                <Server className="h-3 w-3" />
              </motion.div>
            )}
          </motion.div>
        </TooltipTrigger>
        
        <TooltipContent 
          side="bottom" 
          className="max-w-xs p-4 bg-white border border-gray-200 shadow-xl rounded-lg"
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-900">Connection Status</span>
            </div>
            <p className="text-sm text-gray-600">
              {statusConfig.tooltip}
            </p>
            {!isConnected && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  💡 Run: <code className="bg-gray-100 px-1 rounded">uvicorn app.main:app --reload --port 8000</code>
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}