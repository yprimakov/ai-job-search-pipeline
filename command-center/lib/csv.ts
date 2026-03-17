import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import fs from 'fs'
import path from 'path'
import type { TrackerRow, QARow } from './utils'

const ROOT = path.join(process.cwd(), '..')
export const TRACKER_PATH = path.join(ROOT, 'jobs', 'application_tracker.csv')
export const QA_PATH = path.join(ROOT, 'jobs', 'application_qa.csv')
export const QUEUE_PATH = path.join(ROOT, 'jobs', 'queue.json')
export const ENV_PATH = path.join(ROOT, '.env')
export const APPS_DIR = path.join(ROOT, 'applications')

const TRACKER_HEADERS = [
  'Date Applied', 'Company', 'Job Title', 'LinkedIn URL', 'Work Mode',
  'Salary Range', 'Easy Apply', 'Application Status', 'Notes',
  'Tailored Resume File', 'Follow Up Date', 'Date Response Received', 'Response Type',
]

const QA_HEADERS = [
  'Question ID', 'Question', 'Context (where it appeared)',
  'Answer', 'Date Answered', 'Notes',
]

export function readTracker(): TrackerRow[] {
  if (!fs.existsSync(TRACKER_PATH)) return []
  const content = fs.readFileSync(TRACKER_PATH, 'utf-8')
  if (!content.trim()) return []
  try {
    const rows = parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true })
    return rows.map((r: Record<string, string>, i: number) => ({ ...r, _id: i }))
  } catch { return [] }
}

export function writeTracker(rows: TrackerRow[]): void {
  const clean = rows.map(r => {
    const { _id, ...rest } = r as TrackerRow & { _id?: number }
    return rest
  })
  const out = stringify(clean, { header: true, columns: TRACKER_HEADERS })
  fs.mkdirSync(path.dirname(TRACKER_PATH), { recursive: true })
  fs.writeFileSync(TRACKER_PATH, out, 'utf-8')
}

export function readQA(): QARow[] {
  if (!fs.existsSync(QA_PATH)) return []
  const content = fs.readFileSync(QA_PATH, 'utf-8')
  if (!content.trim()) return []
  try {
    const rows = parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true })
    return rows.map((r: Record<string, string>, i: number) => ({ ...r, _id: i }))
  } catch { return [] }
}

export function writeQA(rows: QARow[]): void {
  const clean = rows.map(r => {
    const { _id, ...rest } = r as QARow & { _id?: number }
    return rest
  })
  const out = stringify(clean, { header: true, columns: QA_HEADERS })
  fs.mkdirSync(path.dirname(QA_PATH), { recursive: true })
  fs.writeFileSync(QA_PATH, out, 'utf-8')
}

export function readQueue(): QueueItem[] {
  if (!fs.existsSync(QUEUE_PATH)) return []
  try { return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8')) }
  catch { return [] }
}

export function writeQueue(items: QueueItem[]): void {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true })
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(items, null, 2), 'utf-8')
}

export interface QueueItem {
  id: string
  url: string
  company?: string
  title?: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  submittedAt: string
  completedAt?: string
  outputFolder?: string
  error?: string
}

export function readLinkedInResults(): string {
  const p = path.join(ROOT, 'jobs', 'linkedin_results.md')
  if (!fs.existsSync(p)) return ''
  return fs.readFileSync(p, 'utf-8')
}

export function readEnvVars(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {}
  const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n')
  const result: Record<string, string> = {}
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) result[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return result
}

export function writeEnvVar(key: string, value: string): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
  const regex = new RegExp(`^${key}=.*$`, 'm')
  const newLine = `${key}=${value}`
  if (regex.test(content)) {
    content = content.replace(regex, newLine)
  } else {
    content = content.endsWith('\n') ? content + newLine + '\n' : content + '\n' + newLine + '\n'
  }
  fs.writeFileSync(ENV_PATH, content, 'utf-8')
}
