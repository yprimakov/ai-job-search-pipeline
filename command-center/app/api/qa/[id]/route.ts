import { NextRequest, NextResponse } from 'next/server'
import { readQA, writeQA } from '@/lib/csv'

export const dynamic = 'force-dynamic'

// PATCH /api/qa/[id]  — answer a question
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const idx = parseInt(params.id, 10)
  if (isNaN(idx)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as { Answer?: string; Notes?: string }

  if (!body.Answer?.trim()) {
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
  }

  const rows = readQA()
  if (idx < 0 || idx >= rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const today = new Date().toISOString().slice(0, 10)

  rows[idx] = {
    ...rows[idx],
    'Answer': body.Answer.trim(),
    'Date Answered': today,
    ...(body.Notes !== undefined && { 'Notes': body.Notes }),
    _id: idx,
  }

  writeQA(rows)
  return NextResponse.json(rows[idx])
}
