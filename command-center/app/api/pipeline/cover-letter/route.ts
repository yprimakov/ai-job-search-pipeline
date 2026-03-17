import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { APPS_DIR } from '@/lib/csv'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function runProcess(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }))
    proc.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }))
  })
}

// POST /api/pipeline/cover-letter
// Body: { company: string, title: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    company?: string
    title?: string
  }

  if (!body.company?.trim() || !body.title?.trim()) {
    return NextResponse.json({ error: 'company and title are required' }, { status: 400 })
  }

  const pipelineDir = path.join(APPS_DIR, '..', 'pipeline')
  const jobId = randomUUID()

  const { stdout, stderr, code } = await runProcess(
    'python',
    [
      'cover_letter.py',
      '--company', body.company.trim(),
      '--title', body.title.trim(),
    ],
    pipelineDir,
  )

  if (code !== 0) {
    return NextResponse.json(
      { ok: false, jobId, output: stdout, error: stderr },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, jobId, output: stdout + (stderr ? `\n[stderr]\n${stderr}` : '') })
}
