'use client'

import { motion } from 'framer-motion'
import { 
  Activity, 
  BarChart3,
  Server,
  Database
} from 'lucide-react'

interface SimpleEmptyStateProps {
  type: 'strategies' | 'trades' | 'backend-offline'
  className?: string
}

export function SimpleEmptyState({ type, className = "" }: SimpleEmptyStateProps) {
  const getEmptyStateConfig = () => {
    switch (type) {
      case 'strategies':
        return {
          icon: Activity,
          title: 'No strategies available',
          subtitle: 'Start your FastAPI backend to see strategies',
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-50'
        }
      case 'trades':
        return {
          icon: BarChart3,
          title: 'No trades yet',
          subtitle: 'Run a strategy to see trading history',
          iconColor: 'text-green-500',
          iconBg: 'bg-green-50'
        }
      case 'backend-offline':
        return {
          icon: Server,
          title: 'Backend disconnected',
          subtitle: 'Connect to FastAPI to start trading',
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-50'
        }
      default:
        return {
          icon: Database,
          title: 'No data available',
          subtitle: 'Check your connection and try again',
          iconColor: 'text-gray-500',
          iconBg: 'bg-gray-50'
        }
    }
  }

  const config = getEmptyStateConfig()
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center py-8 px-4 ${className}`}
    >
      <div className={`h-12 w-12 ${config.iconBg} rounded-lg flex items-center justify-center mb-3`}>
        <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
      </div>
      
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        {config.title}
      </h3>
      
      <p className="text-xs text-gray-500 text-center">
        {config.subtitle}
      </p>
    </motion.div>
  )
}