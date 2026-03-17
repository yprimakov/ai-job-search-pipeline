import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return dateStr }
}

export function isFollowUpDue(dateStr: string): boolean {
  if (!dateStr) return false
  try {
    return new Date(dateStr) <= new Date()
  } catch { return false }
}

export function responseRate(rows: TrackerRow[]): number {
  if (!rows.length) return 0
  const responded = rows.filter(r => r['Date Response Received']?.trim())
  return Math.round((responded.length / rows.length) * 100)
}

export interface TrackerRow {
  'Date Applied': string
  'Company': string
  'Job Title': string
  'LinkedIn URL': string
  'Work Mode': string
  'Salary Range': string
  'Easy Apply': string
  'Application Status': string
  'Notes': string
  'Tailored Resume File': string
  'Follow Up Date': string
  'Date Response Received': string
  'Response Type': string
  _id?: number
}

export interface QARow {
  'Question ID': string
  'Question': string
  'Context (where it appeared)': string
  'Answer': string
  'Date Answered': string
  'Notes': string
  _id?: number
}

export const STATUS_ORDER = [
  'Applied', 'Phone Screen', 'Interview', 'Assessment', 'Offer', 'Rejected', 'Ghosted',
]

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    'Applied': 'badge-applied',
    'Phone Screen': 'badge-phone-screen',
    'Interview': 'badge-interview',
    'Assessment': 'badge-assessment',
    'Offer': 'badge-offer',
    'Rejected': 'badge-rejected',
    'Ghosted': 'badge-ghosted',
  }
  return map[status] ?? 'badge-applied'
}
