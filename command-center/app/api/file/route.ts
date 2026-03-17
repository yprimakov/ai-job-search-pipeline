import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Allowed base directories to prevent path traversal
const ALLOWED_ROOTS = [
  path.resolve(process.cwd(), '..', 'applications'),
  path.resolve(process.cwd(), '..', 'resume'),
]

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) {
    return new NextResponse('Missing path parameter', { status: 400 })
  }

  const resolved = path.resolve(filePath)

  // Security: ensure the resolved path is within an allowed root
  const allowed = ALLOWED_ROOTS.some(root => resolved.startsWith(root))
  if (!allowed) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (!fs.existsSync(resolved)) {
    return new NextResponse('File not found', { status: 404 })
  }

  const stat = fs.statSync(resolved)
  if (stat.isDirectory()) {
    return new NextResponse('Is a directory', { status: 400 })
  }

  const ext = path.extname(resolved).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json',
    '.html': 'text/html; charset=utf-8',
  }

  const contentType = mimeTypes[ext] ?? 'application/octet-stream'
  const buffer = fs.readFileSync(resolved)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Content-Disposition': ext === '.pdf'
        ? `inline; filename="${path.basename(resolved)}"`
        : 'inline',
    },
  })
}
