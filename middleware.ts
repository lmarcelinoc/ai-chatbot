import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex } from './lib/constants';

// Public routes that are always accessible
const publicRoutes = ['/login', '/register', '/api/auth', '/ping'];

// API routes that should be publicly accessible for auth operations
const publicApiRoutes = ['/api/auth', '/api/login', '/api/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Allow explicitly public API routes (auth, login, etc.)
  if (publicApiRoutes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow explicitly public pages (login, register)
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next();
  }

  // Get authentication token
  const secureCookie =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.url.startsWith('https://');

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  // Read guest access setting from cookie
  // Default to true if cookie is not set
  const guestAccessCookie = request.cookies.get('allowGuestAccess');
  const allowGuestAccess = guestAccessCookie
    ? guestAccessCookie.value === 'true'
    : true;

  // If user is not authenticated
  if (!token) {
    // If guest access is not allowed, redirect to login
    if (!allowGuestAccess) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // If guest access is allowed, create a guest user session
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  const isGuest = guestRegex.test(token?.email ?? '');

  // If guest access is disabled and current user is a guest, redirect to login
  if (isGuest && !allowGuestAccess) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login/register pages
  if (token && !isGuest && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:path*',
    '/api/:path*',
    '/login',
    '/register',
    '/profile/:path*',
    '/admin/:path*',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
