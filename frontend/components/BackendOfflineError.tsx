'use client'

import { AlertTriangle, Server, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BackendOfflineErrorProps {
  onRetry?: () => void
}

export function BackendOfflineError({ onRetry }: BackendOfflineErrorProps) {
  return (
    <Card className="bg-slate-900/95 border border-red-500/50 rounded-xl shadow-2xl">
      <CardHeader className="text-center pb-6">
        <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Server className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-red-400 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 mr-2" />
          Backend Server Offline
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-lg text-red-300 font-medium">
          The FastAPI backend server is not running or not accessible.
        </p>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 text-left">
          <p className="text-slate-200 font-semibold text-base mb-3">To fix this issue:</p>
          <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
            <li>Navigate to your backend directory</li>
            <li>Run: <code className="bg-slate-700 px-2 py-1 rounded text-emerald-400 font-mono text-xs">python -m uvicorn app.main:app --reload --port 8000</code></li>
            <li>Ensure the server is running on <code className="bg-slate-700 px-2 py-1 rounded text-emerald-400 font-mono text-xs">http://localhost:8000</code></li>
          </ol>
        </div>
        {onRetry && (
          <Button 
            onClick={onRetry}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 font-semibold rounded-lg transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  )
}