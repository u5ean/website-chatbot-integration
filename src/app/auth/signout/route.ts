import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

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

export async function POST(req: Request) {
  const supabase = await createClient();

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  revalidatePath('/', 'layout');
  const origin = getPublicOrigin(req);
  return NextResponse.redirect(new URL('/login', origin), {
    status: 302,
  });
}
