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

// POST /api/pipeline/followup
// Body: { dryRun?: boolean }
// Runs followup.py --dry-run by default; pass dryRun: false to execute for real.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { dryRun?: boolean }

  const dryRun = body.dryRun !== false // default true

  const pipelineDir = path.join(APPS_DIR, '..', 'pipeline')
  const jobId = randomUUID()

  const args = ['followup.py']
  if (dryRun) args.push('--dry-run')

  const { stdout, stderr, code } = await runProcess('python', args, pipelineDir)

  if (code !== 0) {
    return NextResponse.json(
      { ok: false, jobId, output: stdout, error: stderr },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    jobId,
    dryRun,
    output: stdout + (stderr ? `\n[stderr]\n${stderr}` : ''),
  })
}
