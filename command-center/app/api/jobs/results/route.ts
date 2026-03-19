import { NextResponse } from 'next/server'
import { readLinkedInResults } from '@/lib/csv'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Parse linkedin_results.md into structured job objects
function parseLinkedInMd(md: string): {
  jobs: Array<{
    title: string
    company: string
    location: string
    salary?: string
    easyApply?: boolean
    url: string
    score?: number
    fit_reason?: string
  }>
  query?: string
  date?: string
} {
  if (!md.trim()) return { jobs: [] }

  const lines = md.split('\n')
  const jobs: ReturnType<typeof parseLinkedInMd>['jobs'] = []
  let query: string | undefined
  let date: string | undefined

  // Extract metadata from top of file
  for (const line of lines.slice(0, 10)) {
    const qm = line.match(/Query:\s*(.+)/i)
    if (qm) query = qm[1].trim()
    const dm = line.match(/Date:\s*(.+)/i)
    if (dm) date = dm[1].trim()
  }

  // Try to find table rows: | Score | Company | Title | Location | Salary | EA | URL |
  // or any markdown table
  let inTable = false
  let headerLine = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('|')) { inTable = false; continue }

    // Detect header separator
    if (line.includes('---')) { inTable = true; continue }

    if (!inTable) {
      // This might be a header row
      if (line.includes('|')) headerLine = line
      continue
    }

    // Parse data row
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length < 3) continue

    // Detect column positions from header
    const headers = headerLine.split('|').map(c => c.trim().toLowerCase()).filter(Boolean)
    const get = (name: string) => {
      const idx = headers.findIndex(h => h.includes(name))
      return idx >= 0 ? cells[idx] : ''
    }

    // Try score | company | title | location | salary | ea | url pattern
    const scoreStr = get('score')
    const company = get('company') || cells[1] || ''
    const title = get('title') || cells[2] || ''
    const location = get('location') || cells[3] || ''
    const salary = get('salary') || cells[4] || ''
    const eaStr = (get('ea') || get('easy') || cells[5] || '').toLowerCase()
    const url = get('url') || cells[cells.length - 1] || ''

    if (!company && !title) continue

    const scoreNum = (scoreStr != null && scoreStr !== '') ? parseInt(scoreStr, 10) : NaN
    const score = isNaN(scoreNum) ? undefined : scoreNum

    jobs.push({
      title: title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
      company: company.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
      location,
      salary: salary || undefined,
      easyApply: eaStr.includes('yes') || eaStr.includes('ea') || eaStr === 'true',
      url: url.match(/https?:\/\/[^\s)]+/)?.[0] ?? url,
      score: isNaN(score as number) ? undefined : score,
    })
  }

  return { jobs, query, date }
}

export async function GET() {
  const md = readLinkedInResults()
  const parsed = parseLinkedInMd(md)
  return NextResponse.json(parsed)
}

// DELETE /api/jobs/results — clear the linkedin_results.md file
export async function DELETE() {
  const p = path.join(process.cwd(), '..', 'jobs', 'linkedin_results.md')
  try { fs.unlinkSync(p) } catch { /* already gone */ }
  return NextResponse.json({ ok: true })
}
