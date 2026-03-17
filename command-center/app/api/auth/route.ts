import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { password } = body as { password?: string }

  const expected = process.env.COMMAND_CENTER_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'Server misconfigured: no password set' }, { status: 500 })
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const token = createHash('sha256').update(password + today).digest('hex')

  const res = NextResponse.json({ ok: true })
  res.cookies.set('cc_session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
  })
  return res
}
