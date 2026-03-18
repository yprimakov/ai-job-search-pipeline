import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const ROOT      = path.resolve(process.cwd(), '..')
const TITLES_FILE = path.join(ROOT, 'jobs', 'search_titles.json')
const RESUME_FILE = path.join(ROOT, 'pipeline', 'resume_base.md')

const DEFAULT_TITLES = [
  'Principal AI Engineer',
  'Staff AI Engineer',
  'Senior AI Engineer',
  'AI Solutions Architect',
  'AI/ML Engineer',
  'Full Stack AI Engineer',
  'Applied AI Engineer',
  'LLM Engineer',
]

function readSaved(): { titles: string[]; analyzed: boolean } | null {
  try {
    if (fs.existsSync(TITLES_FILE)) {
      return JSON.parse(fs.readFileSync(TITLES_FILE, 'utf8'))
    }
  } catch { /* ignore */ }
  return null
}

export async function GET() {
  const saved = readSaved()
  if (saved) return NextResponse.json(saved)
  return NextResponse.json({ titles: DEFAULT_TITLES, analyzed: false })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { titles?: string[] }

  // If caller just wants to save a custom list
  if (body.titles) {
    const payload = { titles: body.titles, analyzed: false }
    fs.mkdirSync(path.dirname(TITLES_FILE), { recursive: true })
    fs.writeFileSync(TITLES_FILE, JSON.stringify(payload, null, 2))
    return NextResponse.json(payload)
  }

  // Otherwise analyze resume_base.md with Claude Haiku
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  let resumeText = ''
  try {
    resumeText = fs.readFileSync(RESUME_FILE, 'utf8')
  } catch {
    return NextResponse.json({ error: 'resume_base.md not found' }, { status: 404 })
  }

  // Truncate to ~4000 chars to keep the prompt small
  const excerpt = resumeText.slice(0, 4000)

  const prompt = `You are a job search assistant. Based on this resume excerpt, suggest 8-12 specific job title search queries for LinkedIn that would surface the best matches for this candidate. Return ONLY a JSON array of strings — no explanation, no markdown, no code fences.

Rules:
- Each title should be a realistic LinkedIn search query (1-5 words)
- Order from most to least relevant
- Include seniority variants where appropriate (Principal, Staff, Senior, Lead)
- Focus on roles where the candidate's AI/ML and full-stack experience adds maximum value

Resume excerpt:
${excerpt}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const json = await res.json() as { content?: Array<{ text: string }> }
    const raw = json.content?.[0]?.text?.trim() ?? ''

    // Strip code fences if present
    const clean = raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim()
    const titles: string[] = JSON.parse(clean)

    const payload = { titles, analyzed: true }
    fs.mkdirSync(path.dirname(TITLES_FILE), { recursive: true })
    fs.writeFileSync(TITLES_FILE, JSON.stringify(payload, null, 2))

    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to analyze resume: ${String(err)}` },
      { status: 500 }
    )
  }
}
