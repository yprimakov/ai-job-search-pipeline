import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { readTracker, APPS_DIR } from '@/lib/csv'
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

function findJDFile(company: string, title: string): string | null {
  // Check APPS_DIR for a folder matching company + title
  if (fs.existsSync(APPS_DIR)) {
    const entries = fs.readdirSync(APPS_DIR)
    const slug = `${company}_${title}`.toLowerCase().replace(/\s+/g, '_')
    for (const entry of entries) {
      if (entry.toLowerCase().includes(company.toLowerCase())) {
        const jdPath = path.join(APPS_DIR, entry, 'job_description.txt')
        if (fs.existsSync(jdPath)) return jdPath
      }
    }
  }

  // Check tracker for a matching row with a JD path hint
  const rows = readTracker()
  for (const r of rows) {
    if (
      r['Company']?.toLowerCase() === company.toLowerCase() &&
      r['Job Title']?.toLowerCase() === title.toLowerCase()
    ) {
      // Try to derive path from tailored resume file path
      const resumeFile = r['Tailored Resume File']?.trim()
      if (resumeFile) {
        const dir = path.dirname(resumeFile)
        const jdPath = path.join(dir, 'job_description.txt')
        if (fs.existsSync(jdPath)) return jdPath
      }
    }
  }

  // Fallback: look in jobs/ sibling directory for a matching .txt file
  const jobsDir = path.join(APPS_DIR, '..', 'jobs')
  if (fs.existsSync(jobsDir)) {
    const files = fs.readdirSync(jobsDir).filter(f => f.endsWith('.txt'))
    const slug = company.toLowerCase().replace(/\s+/g, '_')
    for (const f of files) {
      if (f.toLowerCase().includes(slug)) return path.join(jobsDir, f)
    }
  }

  return null
}

// POST /api/pipeline/tailor
// Body: { company: string, title: string, jdPath?: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    company?: string
    title?: string
    jdPath?: string
  }

  if (!body.company?.trim() || !body.title?.trim()) {
    return NextResponse.json({ error: 'company and title are required' }, { status: 400 })
  }

  const jdPath = body.jdPath?.trim() || findJDFile(body.company.trim(), body.title.trim())
  if (!jdPath) {
    return NextResponse.json(
      { error: `Could not locate job_description.txt for ${body.company} / ${body.title}` },
      { status: 422 },
    )
  }

  const pipelineDir = path.join(APPS_DIR, '..', 'pipeline')
  const jobId = randomUUID()

  const { stdout, stderr, code } = await runProcess(
    'python',
    ['tailor_resume.py', '--jd', jdPath],
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
