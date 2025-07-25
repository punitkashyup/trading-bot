import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'OPEN': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'CLOSED': return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'CANCELLED': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'PENDING': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'ACTIVE': return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'INACTIVE': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    case 'LIVE': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'VIRTUAL': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

export function getPnLColor(pnl: number): string {
  return pnl >= 0 ? 'text-green-400' : 'text-red-400'
}

export function truncateString(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}