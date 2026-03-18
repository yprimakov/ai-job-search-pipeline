import { spawn } from 'child_process'
import path from 'path'
import { APPS_DIR } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const PIPELINE_DIR = path.resolve(APPS_DIR, '..', 'pipeline')

// POST /api/pipeline/process-queue
// Streams stdout/stderr from process_queue.py back to the browser
export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn('python', ['process_queue.py'], {
        cwd: PIPELINE_DIR,
        shell: process.platform === 'win32',
      })

      const send = (text: string) => {
        try { controller.enqueue(encoder.encode(text)) } catch { /* closed */ }
      }

      proc.stdout.on('data', (d: Buffer) => send(d.toString()))
      proc.stderr.on('data', (d: Buffer) => send(d.toString()))

      proc.on('close', (code: number | null) => {
        send(`\n--- Finished (exit code ${code ?? 0}) ---\n`)
        try { controller.close() } catch { /* already closed */ }
      })

      proc.on('error', (err: Error) => {
        send(`\nFailed to start process: ${err.message}\n`)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
