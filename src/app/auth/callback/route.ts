import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function getPublicOrigin(req: Request) {
  const url = new URL(req.url);
  const proto = (req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https').toLowerCase();
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host || '').toLowerCase();
  if (host) return `${proto}://${host}`;
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) {
    try {
      return new URL(env).origin;
    } catch {}
  }
  return url.origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getPublicOrigin(request);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
