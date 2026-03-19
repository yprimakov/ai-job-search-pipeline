import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const rootDir = path.resolve(process.cwd(), '..')
const SENTINEL = path.join(rootDir, 'jobs', '.scraper_running')

// GET /api/pipeline/scrape — check if scraper is currently running
export async function GET() {
  return NextResponse.json({ running: fs.existsSync(SENTINEL) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    queries?: string[]   // multi-title run
    query?: string       // single query (legacy)
    remote?: boolean
    easyApply?: boolean
    pages?: number
  }

  // Resolve list of queries
  const queries: string[] = []
  if (body.queries?.length) {
    queries.push(...body.queries.filter(q => q.trim()))
  } else if (body.query?.trim()) {
    queries.push(body.query.trim())
  }

  if (queries.length === 0) {
    return NextResponse.json({ ok: false, error: 'At least one search query is required.' }, { status: 400 })
  }

  const script   = path.join(rootDir, 'pipeline', 'linkedin_scraper.py')
  const merger   = path.join(rootDir, 'pipeline', 'merge_linkedin_results.py')

  const flags: string[] = []
  if (body.remote !== false)   flags.push('--remote')
  if (body.easyApply !== false) flags.push('--easy-apply')
  if (body.pages)               flags.push(`--pages ${body.pages}`)

  // Sentinel: presence of this file means the scraper is running
  const batLines: string[] = [
    '@echo off',
    `cd /d "${rootDir}"`,
    `echo. > "${SENTINEL}"`,
    'echo Running LinkedIn scraper...',
    'echo.',
  ]

  if (queries.length === 1) {
    batLines.push(`python "${script}" --query "${queries[0]}" ${flags.join(' ')}`)
  } else {
    queries.forEach((q, i) => {
      const tmpOut = path.join(rootDir, 'jobs', `.tmp_results_${i}.md`)
      batLines.push(`echo Searching: ${q}`)
      batLines.push(`python "${script}" --query "${q}" ${flags.join(' ')} --output "${tmpOut}"`)
      batLines.push('echo.')
    })
    const queryArgs = queries.map(q => `"${q}"`).join(' ')
    batLines.push(`python "${merger}" ${queryArgs}`)
  }

  batLines.push(
    'echo.',
    'echo Done! Results saved to jobs/linkedin_results.md.',
    `del "${SENTINEL}" 2>nul`,
    '',
  )

  const batPath = path.join(rootDir, '.scraper_launch.bat')
  fs.writeFileSync(batPath, batLines.join('\r\n'))

  // /c closes the window when done (was /k which kept it open forever)
  const proc = spawn(
    'cmd.exe',
    ['/c', 'start', 'cmd', '/c', batPath],
    { detached: true, stdio: 'ignore', shell: false }
  )
  proc.unref()

  const label = queries.length === 1
    ? `"${queries[0]}"`
    : `${queries.length} queries (${queries.join(', ')})`

  return NextResponse.json({
    ok: true,
    message: `Scraper launched for ${label}. A Chrome window will open. Results will appear automatically when complete.`,
  })
}
