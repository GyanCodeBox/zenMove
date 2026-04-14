// src/utils/index.ts
import { format, formatDistanceToNow } from 'date-fns'
import type { MoveStatus } from '../services/api'

export function formatDate(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy')
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy, hh:mm a')
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const STATUS_LABEL: Record<MoveStatus, string> = {
  quoted:     'Quoted',
  booked:     'Booked',
  loading:    'Loading',
  in_transit: 'In Transit',
  delivered:  'Delivered',
  disputed:   'Disputed',
  completed:  'Completed',
}

export const STATUS_NEXT: Partial<Record<MoveStatus, MoveStatus>> = {
  quoted:     'booked',
  booked:     'loading',
  loading:    'in_transit',
  in_transit: 'delivered',
  delivered:  'completed',
}

export const CONDITION_LABEL = {
  good:    'Good',
  fragile: 'Fragile',
  damaged: 'Damaged',
  missing: 'Missing',
}
