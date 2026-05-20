import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isWaitlistModeEnabled() {
  const v = process.env.WAITLIST_MODE;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function parseAdminEmails() {
  const raw = process.env.WAITLIST_ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedPublicPath(pathname: string) {
  if (pathname === '/') return true;
  if (pathname === '/login') return true;
  if (pathname.startsWith('/auth/')) return true;
  if (pathname === '/api/waitlist') return true;
  if (pathname === '/api/webhooks/stripe') return true;
  if (pathname === '/api/jobs/process') return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return  request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isWaitlistModeEnabled()) {
    const pathname = request.nextUrl.pathname;
    if (isAllowedPublicPath(pathname)) {
      return response;
    }

    const email = user?.email?.toLowerCase() ?? null;
    const isAdmin = email ? parseAdminEmails().includes(email) : false;
    if (isAdmin) {
      return response;
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unavailable' }, { status: 403 });
    }

    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
