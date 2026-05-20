import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function getClientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}

function isValidEmail(email: string) {
  if (!email) return false;
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function checkLimit(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  key: string,
  windowSeconds: number,
  limit: number
) {
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  return Boolean(row?.allowed);
}

export async function POST(req: Request) {
  try {
    const admin = await createAdminClient();
    const ip = getClientIp(req);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const websiteRaw = typeof body.website === 'string' ? body.website.trim() : '';
    const email = emailRaw.toLowerCase();
    const website = websiteRaw ? websiteRaw.slice(0, 300) : '';

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (name.length > 120) return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Email is invalid' }, { status: 400 });

    const ipOk = await checkLimit(admin, `waitlist:ip:${ip}`, 3600, 20);
    if (!ipOk) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const emailOk = await checkLimit(admin, `waitlist:email:${email}`, 86400, 3);
    if (!emailOk) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { error } = await admin.from('waitlist').insert({
      name,
      email,
      website: website || null,
    });

    if (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === '23505') {
        return NextResponse.json({ error: 'Email already on the waitlist' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

