import { NextResponse } from 'next/server'
import { readTracker, readQA } from '@/lib/csv'

export const dynamic = 'force-dynamic'

interface ActivityEvent {
  type: 'applied' | 'response' | 'qa_answered'
  label: string
  date: string
  sub?: string
}

export async function GET() {
  const tracker = readTracker()
  const qa = readQA()

  const events: ActivityEvent[] = []

  // Application logged events
  for (const r of tracker) {
    const d = r['Date Applied']?.trim()
    if (d) {
      events.push({
        type: 'applied',
        label: `Applied to ${r['Company']}`,
        date: d,
        sub: r['Job Title'] || undefined,
      })
    }
  }

  // Response received events
  for (const r of tracker) {
    const d = r['Date Response Received']?.trim()
    if (d) {
      const responseType = r['Response Type']?.trim()
      const label = responseType
        ? `${responseType} from ${r['Company']}`
        : `Response from ${r['Company']}`
      events.push({
        type: 'response',
        label,
        date: d,
        sub: r['Job Title'] || undefined,
      })
    }
  }

  // Q&A answered events
  for (const r of qa) {
    const d = r['Date Answered']?.trim()
    if (d && r['Answer']?.trim()) {
      events.push({
        type: 'qa_answered',
        label: `Answered: ${r['Question']}`,
        date: d,
        sub: r['Context (where it appeared)'] || undefined,
      })
    }
  }

  // Sort descending by date, take last 12
  events.sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    // Invalid dates go to the end
    if (isNaN(da) && isNaN(db)) return 0
    if (isNaN(da)) return 1
    if (isNaN(db)) return -1
    return db - da
  })

  return NextResponse.json(events.slice(0, 12))
}
