import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // ── Security headers on ALL responses ──
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';"
  );

  // ── Origin check on API POST/PUT/DELETE (CSRF protection) ──
  if (pathname.startsWith('/api') && request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new NextResponse(JSON.stringify({ error: 'Forbidden: origin mismatch' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        return new NextResponse(JSON.stringify({ error: 'Forbidden: invalid origin' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|images/|swf/).*)',
  ],
};
