import { NextRequest, NextResponse } from 'next/server'

function getDayKey() {
  return new Date().toISOString().slice(0, 10)
}

async function makeToken(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(password + getDayKey())
  )
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(req: NextRequest) {
  const password = process.env.COMMAND_CENTER_PASSWORD
  if (!password) return NextResponse.next()

  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/ws') ||
    pathname === '/login' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/logo')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('cc_session')?.value
  const expected = await makeToken(password)

  if (token === expected) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
