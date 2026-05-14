import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function normalizeOrigin(input: string) {
  try {
    return new URL(input).origin.toLowerCase();
  } catch {
    return '';
  }
}

function getClientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}

function parseOriginListEnv(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => normalizeOrigin(s.trim()))
    .filter(Boolean);
}

function buildAllowedOrigins(config: any) {
  const envAllowed = parseOriginListEnv(process.env.WIDGET_ALLOWED_ORIGINS);
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) : '';
  const websiteOrigin =
    typeof config?.website_url === 'string' && config.website_url
      ? normalizeOrigin(config.website_url)
      : '';

  const rowAllowed =
    Array.isArray(config?.allowed_origins)
      ? (config.allowed_origins as unknown[])
          .map((o) => (typeof o === 'string' ? normalizeOrigin(o) : ''))
          .filter(Boolean)
      : [];

  return Array.from(new Set([appOrigin, websiteOrigin, ...rowAllowed, ...envAllowed].filter(Boolean)));
}

function corsHeaders(req: Request, allowed: { ok: true; origin: string } | { ok: false }) {
  if (!allowed.ok) return { Vary: 'Origin' };
  const requestedHeaders = req.headers.get('access-control-request-headers');
  return {
    'Access-Control-Allow-Origin': allowed.origin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': requestedHeaders || 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function checkLimit(supabase: Awaited<ReturnType<typeof createAdminClient>>, key: string, windowSeconds: number, limit: number) {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  const allowed = Boolean(row?.allowed);
  return { allowed };
}

export async function OPTIONS(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(null, { status: 400 });

  const supabase = await createAdminClient();
  const { data: config } = await supabase
    .from('chatbot_configs')
    .select('id,website_url,allowed_origins,is_active')
    .eq('id', id)
    .single();

  if (!config?.id || config.is_active === false) return new Response(null, { status: 403 });

  const originRaw = req.headers.get('origin');
  if (!originRaw) return new Response(null, { status: 204 });

  const origin = normalizeOrigin(originRaw);
  const allowedOrigins = buildAllowedOrigins(config);
  const allowed = origin && allowedOrigins.includes(origin) ? { ok: true as const, origin } : { ok: false as const };
  if (!allowed.ok) return new Response(null, { status: 403 });

  const headers = corsHeaders(req, allowed);
  return new Response(null, { status: 204, headers: new Headers(headers as Record<string, string>) });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (!data.is_active) {
      return NextResponse.json({ error: 'Chatbot is inactive' }, { status: 403 });
    }

    const originRaw = req.headers.get('origin');
    const corsAllowed =
      originRaw && normalizeOrigin(originRaw)
        ? (() => {
            const origin = normalizeOrigin(originRaw);
            const allowedOrigins = buildAllowedOrigins(data);
            return origin && allowedOrigins.includes(origin)
              ? ({ ok: true as const, origin } as const)
              : ({ ok: false as const } as const);
          })()
        : ({ ok: false as const } as const);

    const cors = corsAllowed.ok ? corsHeaders(req, corsAllowed) : {};
    if (originRaw && !corsAllowed.ok) return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });

    const ip = getClientIp(req);
    const windowSeconds = 60;
    const perIpGlobal = Number(process.env.CONFIG_RATE_LIMIT_IP_PER_MIN ?? 240);
    const perIpPerBot = Number(process.env.CONFIG_RATE_LIMIT_IP_BOT_PER_MIN ?? 60);

    const g1 = await checkLimit(supabase, `config:ip:${ip}`, windowSeconds, perIpGlobal);
    if (!g1.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    }

    const g2 = await checkLimit(supabase, `config:bot:${id}:ip:${ip}`, windowSeconds, perIpPerBot);
    if (!g2.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    }

    // Return only public configuration
    return NextResponse.json({
      name: data.persona_name || data.name,
      welcome_message: data.welcome_message,
      colors: data.colors,
      bubble_position: data.bubble_position,
      avatar_url: data.avatar_url,
      starter_questions: data.starter_questions,
      lead_capture_enabled: data.lead_capture_enabled,
      handoff_url: data.handoff_url,
    }, { headers: cors });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
