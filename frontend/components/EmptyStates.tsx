'use client'

import { motion } from 'framer-motion'
import { 
  Activity, 
  TrendingUp, 
  Server, 
  Play, 
  BarChart3,
  ArrowRight,
  Sparkles,
  Database,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MagicCard } from '@/components/magicui/magic-card'

interface EmptyStateProps {
  type: 'strategies' | 'trades' | 'backend-offline'
  onAction?: () => void
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const getEmptyStateConfig = () => {
    switch (type) {
      case 'strategies':
        return {
          icon: Activity,
          title: 'No Active Strategies',
          description: 'Your trading strategies will appear here once they\'re created and running.',
          actionText: 'Start FastAPI Backend',
          helpText: 'Strategies are automatically created when your backend connects',
          gradient: 'from-blue-500/20 to-purple-500/20',
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100'
        }
      case 'trades':
        return {
          icon: BarChart3,
          title: 'No Trades Yet',
          description: 'Your trading history will appear here once strategies start executing.',
          actionText: 'Run a Strategy',
          helpText: 'Enable simulation mode on any strategy to begin trading',
          gradient: 'from-green-500/20 to-emerald-500/20',
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100'
        }
      case 'backend-offline':
        return {
          icon: Server,
          title: 'Backend Disconnected',
          description: 'Connect to your FastAPI backend to start trading and view real-time data.',
          actionText: 'Retry Connection',
          helpText: 'Make sure your FastAPI server is running on port 8001',
          gradient: 'from-orange-500/20 to-red-500/20',
          iconColor: 'text-orange-600',
          iconBg: 'bg-orange-100'
        }
      default:
        return {
          icon: Database,
          title: 'No Data Available',
          description: 'Data will appear here once the system is connected.',
          actionText: 'Refresh',
          helpText: 'Check your connection and try again',
          gradient: 'from-gray-500/20 to-slate-500/20',
          iconColor: 'text-gray-600',
          iconBg: 'bg-gray-100'
        }
    }
  }

  const config = getEmptyStateConfig()
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center p-12"
    >
      <MagicCard 
        className={`max-w-md mx-auto text-center bg-gradient-to-br ${config.gradient} backdrop-blur-sm border-gray-200/50`}
        gradientColor="#f8fafc"
        gradientOpacity={0.3}
      >
        <div className="p-8">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`h-16 w-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}
          >
            <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
          </motion.div>

          {/* Title with Sparkle Effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              {config.title}
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {config.description}
            </p>
          </motion.div>

          {/* Action Button */}
          {onAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-4"
            >
              <Button
                onClick={onAction}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {config.actionText}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border">
              💡 {config.helpText}
            </p>
          </motion.div>
        </div>
      </MagicCard>
    </motion.div>
  )
}

// Loading skeleton component
export function LoadingSkeleton({ type = 'card' }: { type?: 'card' | 'list' | 'stats' }) {
  const getSkeletonConfig = () => {
    switch (type) {
      case 'stats':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-gray-300 rounded"></div>
                      <div className="h-6 w-20 bg-gray-300 rounded"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-300 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      case 'list':
        return (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                      <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      default:
        return (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                  <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-full bg-gray-300 rounded"></div>
                <div className="h-3 w-5/6 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {getSkeletonConfig()}
    </motion.div>
  )
}