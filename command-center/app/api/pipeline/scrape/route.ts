import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    query?: string
    remote?: boolean
    easyApply?: boolean
    pages?: number
  }

  const rootDir = path.resolve(process.cwd(), '..')
  const scriptPath = path.join(rootDir, 'pipeline', 'linkedin_scraper.py')

  // Build args
  const args: string[] = []
  if (body.query?.trim()) args.push(`--query "${body.query.trim()}"`)
  if (body.remote !== false) args.push('--remote')
  if (body.easyApply !== false) args.push('--easy-apply')
  if (body.pages) args.push(`--pages ${body.pages}`)

  const pythonCmd = `python "${scriptPath}" ${args.join(' ')}`

  // Launch in a new Windows terminal window (detached) so Playwright can open Chrome
  // The terminal stays open after completion so the user can see output
  const proc = spawn(
    'cmd.exe',
    ['/c', 'start', 'cmd', '/k', `cd /d "${rootDir}" && ${pythonCmd} && echo. && echo Done! Results saved to jobs/linkedin_results.md`],
    { detached: true, stdio: 'ignore', shell: false }
  )
  proc.unref()

  return NextResponse.json({
    ok: true,
    message: 'Scraper launched in external terminal. A Chrome window will open for LinkedIn. Results will appear automatically when complete.',
  })
}
