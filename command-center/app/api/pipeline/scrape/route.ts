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

  const scriptPath = path.join(process.cwd(), '..', 'pipeline', 'linkedin_scraper.py')
  const args: string[] = []

  if (body.query) args.push('--query', body.query)
  if (body.remote !== false) args.push('--remote')
  if (body.easyApply !== false) args.push('--easy-apply')
  if (body.pages) args.push('--pages', String(body.pages))

  return new Promise<NextResponse>(resolve => {
    const proc = spawn('python', [scriptPath, ...args], {
      cwd: path.join(process.cwd(), '..'),
      timeout: 120_000,
    })

    let output = ''
    let error = ''

    proc.stdout.on('data', (d: Buffer) => { output += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { error += d.toString() })

    proc.on('close', code => {
      if (code !== 0) {
        resolve(NextResponse.json({ error: error || 'Scraper failed', output }, { status: 500 }))
      } else {
        resolve(NextResponse.json({ output: output || 'Scraper completed.' }))
      }
    })

    proc.on('error', err => {
      resolve(NextResponse.json({ error: err.message }, { status: 500 }))
    })
  })
}
