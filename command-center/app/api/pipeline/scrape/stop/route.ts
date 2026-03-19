import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const rootDir = path.resolve(process.cwd(), '..')
const SENTINEL = path.join(rootDir, 'jobs', '.scraper_running')

// POST /api/pipeline/scrape/stop
// Kills any python process running linkedin_scraper.py and cleans up the sentinel
export async function POST() {
  // Kill matching python processes via PowerShell (Windows-safe, targeted)
  await new Promise<void>(resolve => {
    const proc = spawn(
      'powershell',
      [
        '-NonInteractive', '-NoProfile', '-Command',
        `Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*linkedin_scraper*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ],
      { shell: false },
    )
    proc.on('close', () => resolve())
    proc.on('error', () => resolve())
  })

  // Clean up sentinel file
  try { fs.unlinkSync(SENTINEL) } catch { /* already gone */ }

  return NextResponse.json({ ok: true })
}
