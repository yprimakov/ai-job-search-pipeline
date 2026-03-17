import { NextResponse } from 'next/server'
import { readTracker, readQA } from '@/lib/csv'
import { isFollowUpDue, STATUS_ORDER } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function parseSalaryBucket(salary: string): string | null {
  if (!salary?.trim()) return null
  // Extract first dollar amount found, e.g. "$150K", "$200,000", "150k"
  const m = salary.match(/\$?([\d,]+)[kK]?/)
  if (!m) return null
  let val = parseFloat(m[1].replace(/,/g, ''))
  // Normalize to thousands
  if (val >= 1000) val = val / 1000
  if (val < 50) return null
  if (val < 100) return '$50k-$100k'
  if (val < 150) return '$100k-$150k'
  if (val < 200) return '$150k-$200k'
  if (val < 250) return '$200k-$250k'
  if (val < 300) return '$250k-$300k'
  if (val < 350) return '$300k-$350k'
  return '$350k+'
}

function daysBetween(a: string, b: string): number | null {
  try {
    const da = new Date(a).getTime()
    const db = new Date(b).getTime()
    if (isNaN(da) || isNaN(db)) return null
    return Math.round(Math.abs(db - da) / 86_400_000)
  } catch { return null }
}

export async function GET() {
  const tracker = readTracker()
  const qa = readQA()

  const total = tracker.length
  const responded = tracker.filter(r => r['Date Response Received']?.trim()).length
  const rate = total > 0 ? Math.round((responded / total) * 100) : 0

  const active = tracker.filter(r => {
    const s = r['Application Status']
    return !['Rejected', 'Ghosted', 'Offer'].includes(s)
  }).length

  const followUpDue = tracker.filter(r => isFollowUpDue(r['Follow Up Date'])).length

  const unansweredQA = qa.filter(r => !r['Answer']?.trim()).length

  // By status
  const statusMap: Record<string, number> = {}
  for (const r of tracker) {
    const s = r['Application Status'] || 'Unknown'
    statusMap[s] = (statusMap[s] ?? 0) + 1
  }
  const byStatus = STATUS_ORDER
    .filter(s => statusMap[s] !== undefined)
    .map(s => ({ status: s, count: statusMap[s] }))
  // Include any statuses not in STATUS_ORDER
  for (const [s, c] of Object.entries(statusMap)) {
    if (!STATUS_ORDER.includes(s)) byStatus.push({ status: s, count: c })
  }

  // By work mode
  const workModeMap: Record<string, { total: number; responded: number }> = {}
  for (const r of tracker) {
    const mode = r['Work Mode'] || 'Unknown'
    if (!workModeMap[mode]) workModeMap[mode] = { total: 0, responded: 0 }
    workModeMap[mode].total++
    if (r['Date Response Received']?.trim()) workModeMap[mode].responded++
  }
  const byWorkMode = Object.entries(workModeMap).map(([mode, v]) => ({ mode, ...v }))

  // By Easy Apply
  const eaRows = tracker.filter(r => r['Easy Apply']?.trim().toLowerCase() === 'yes')
  const directRows = tracker.filter(r => r['Easy Apply']?.trim().toLowerCase() !== 'yes')
  const byEasyApply = {
    eaTotal: eaRows.length,
    eaResponded: eaRows.filter(r => r['Date Response Received']?.trim()).length,
    directTotal: directRows.length,
    directResponded: directRows.filter(r => r['Date Response Received']?.trim()).length,
  }

  // By response type
  const respTypeMap: Record<string, number> = {}
  for (const r of tracker) {
    const t = r['Response Type']?.trim()
    if (t) respTypeMap[t] = (respTypeMap[t] ?? 0) + 1
  }
  const byResponseType = Object.entries(respTypeMap).map(([type, count]) => ({ type, count }))

  // Days to response
  const daysToResponse: number[] = []
  for (const r of tracker) {
    if (r['Date Applied']?.trim() && r['Date Response Received']?.trim()) {
      const d = daysBetween(r['Date Applied'], r['Date Response Received'])
      if (d !== null) daysToResponse.push(d)
    }
  }

  // Over time (applications per date)
  const dateMap: Record<string, number> = {}
  for (const r of tracker) {
    const d = r['Date Applied']?.trim()
    if (d) dateMap[d] = (dateMap[d] ?? 0) + 1
  }
  const overTime = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  // By salary bucket
  const salaryMap: Record<string, number> = {}
  for (const r of tracker) {
    const bucket = parseSalaryBucket(r['Salary Range'])
    if (bucket) salaryMap[bucket] = (salaryMap[bucket] ?? 0) + 1
  }
  const bucketOrder = [
    '$50k-$100k', '$100k-$150k', '$150k-$200k',
    '$200k-$250k', '$250k-$300k', '$300k-$350k', '$350k+',
  ]
  const bySalary = bucketOrder
    .filter(b => salaryMap[b] !== undefined)
    .map(b => ({ bucket: b, count: salaryMap[b] }))

  return NextResponse.json({
    total,
    responded,
    responseRate: rate,
    active,
    followUpDue,
    unansweredQA,
    byStatus,
    byWorkMode,
    byEasyApply,
    byResponseType,
    daysToResponse,
    overTime,
    bySalary,
  })
}
