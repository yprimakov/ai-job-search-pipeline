import { NextRequest, NextResponse } from 'next/server'
import { readQA, writeQA } from '@/lib/csv'
import type { QARow } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET /api/qa  — unanswered first, then answered
export async function GET() {
  const rows = readQA()

  const unanswered = rows.filter(r => !r['Answer']?.trim())
  const answered = rows.filter(r => r['Answer']?.trim())

  return NextResponse.json([...unanswered, ...answered])
}

// POST /api/qa  — add a new question
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Partial<QARow>

  if (!body['Question']?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  const rows = readQA()

  // Auto-increment Question ID: find the highest existing numeric suffix
  let maxNum = 0
  for (const r of rows) {
    const m = r['Question ID']?.match(/^Q(\d+)$/)
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
  }
  const nextId = `Q${String(maxNum + 1).padStart(3, '0')}`

  const newRow: QARow = {
    'Question ID': nextId,
    'Question': body['Question'].trim(),
    'Context (where it appeared)': body['Context (where it appeared)'] ?? '',
    'Answer': body['Answer'] ?? '',
    'Date Answered': body['Date Answered'] ?? '',
    'Notes': body['Notes'] ?? '',
    _id: rows.length,
  }

  rows.push(newRow)
  writeQA(rows)

  return NextResponse.json(newRow, { status: 201 })
}
