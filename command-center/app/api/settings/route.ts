import { NextRequest, NextResponse } from 'next/server'
import { readEnvVars, writeEnvVar } from '@/lib/csv'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const CANDIDATE_KEYS = [
  'CANDIDATE_NAME', 'CANDIDATE_TITLE', 'CANDIDATE_EMAIL',
  'CANDIDATE_PHONE', 'CANDIDATE_LOCATION', 'CANDIDATE_WEBSITE',
]

const PIPELINE_KEYS = [
  'DEFAULT_WORK_MODE', 'FOLLOWUP_DAYS', 'SCRAPER_REMOTE', 'SCRAPER_EASY_APPLY',
]

export async function GET() {
  const all = readEnvVars()
  const result: Record<string, unknown> = {}

  for (const key of [...CANDIDATE_KEYS, ...PIPELINE_KEYS]) {
    result[key] = all[key] ?? ''
  }

  // Integration status checks
  const gmailToken = path.join(process.cwd(), '..', 'pipeline', 'gmail_token.json')
  const herenowCreds = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', '.herenow', 'credentials')

  result.integrations = {
    anthropic: !!all['ANTHROPIC_API_KEY'],
    gmail: fs.existsSync(gmailToken),
    herenow: fs.existsSync(herenowCreds),
  }

  return NextResponse.json(result)
}

// PATCH /api/settings — accepts { key, value } or a full object of key/value pairs
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Single key/value mode
  if (body.key !== undefined) {
    if (!body.key?.trim()) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }
    writeEnvVar(body.key.trim(), String(body.value ?? ''))
    return NextResponse.json({ ok: true })
  }

  // Bulk mode: object of key/value pairs
  const allowed = new Set([...CANDIDATE_KEYS, ...PIPELINE_KEYS])
  for (const [key, value] of Object.entries(body)) {
    if (allowed.has(key) && typeof value === 'string') {
      writeEnvVar(key, value)
    }
  }

  return NextResponse.json({ ok: true })
}
