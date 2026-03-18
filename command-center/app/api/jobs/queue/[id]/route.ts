import { NextRequest, NextResponse } from 'next/server'
import { readQueue, writeQueue } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const items = readQueue()
  const filtered = items.filter(item => item.id !== params.id)
  if (filtered.length === items.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  writeQueue(filtered)
  return NextResponse.json({ ok: true })
}
