import { NextRequest, NextResponse } from 'next/server'
import { readQueue, writeQueue } from '@/lib/csv'
import type { QueueItem } from '@/lib/csv'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/jobs/queue  — return all queue items
export async function GET() {
  const items = readQueue()
  return NextResponse.json(items)
}

// POST /api/jobs/queue  — add a new job URL to the queue
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    url?: string
    company?: string
    title?: string
  }

  if (!body.url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const items = readQueue()

  const newItem: QueueItem = {
    id: randomUUID(),
    url: body.url.trim(),
    ...(body.company && { company: body.company.trim() }),
    ...(body.title && { title: body.title.trim() }),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  }

  items.push(newItem)
  writeQueue(items)

  return NextResponse.json(newItem, { status: 201 })
}
