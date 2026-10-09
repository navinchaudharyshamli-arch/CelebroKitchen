import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionToken = request.cookies.get('session_token')?.value;

  // Protect member pages
  if (path.startsWith('/today') || path.startsWith('/skip/next') || path.startsWith('/history') || path.startsWith('/me')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/today/:path*', '/skip/next/:path*', '/history/:path*', '/me/:path*'],
};
