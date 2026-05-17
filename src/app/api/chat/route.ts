import { NextResponse } from 'next/server';
import { openai, generateEmbedding } from '@/lib/openai';
import { createAdminClient } from '@/lib/supabase/server';

type MatchChunkRow = {
  content: string | null;
  source_url: string | null;
};

type HistoryRow = {
  role: string | null;
  content: string | null;
};

type ChatRole = 'user' | 'assistant' | 'system';

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

function corsHeaders(req: Request, allowed: { ok: true; origin: string } | { ok: false }): Record<string, string> {
  if (!allowed.ok) {
    return {
      Vary: 'Origin',
    };
  }
  const requestedHeaders = req.headers.get('access-control-request-headers');
  return {
    'Access-Control-Allow-Origin': allowed.origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': requestedHeaders || 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatbotId = searchParams.get('chatbotId');
  if (!chatbotId) return new Response(null, { status: 400 });

  const supabase = await createAdminClient();
  const { data: config } = await supabase
    .from('chatbot_configs')
    .select('id,website_url,allowed_origins,is_active')
    .eq('id', chatbotId)
    .single();

  if (!config?.id || config.is_active === false) return new Response(null, { status: 403 });

  const originRaw = req.headers.get('origin');
  if (!originRaw) return new Response(null, { status: 204 });

  const origin = normalizeOrigin(originRaw);
  const allowedOrigins = buildAllowedOrigins(config);
  const allowed = origin && allowedOrigins.includes(origin) ? { ok: true as const, origin } : { ok: false as const };

  if (!allowed.ok) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(req, allowed) });
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
  const resetAt = typeof row?.reset_at === 'string' ? row.reset_at : '';
  return { allowed, resetAt };
}

export async function POST(req: Request) {
  try {
    const { chatbotId, message, sessionId, leadName, leadEmail } = await req.json();

    if (!chatbotId || !message) {
      return NextResponse.json({ error: 'Chatbot ID and message are required' }, { status: 400 });
    }

    const msg = typeof message === 'string' ? message.trim() : '';
    if (!msg) return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    if (msg.length > 2000) return NextResponse.json({ error: 'Message too long' }, { status: 400 });

    const supabase = await createAdminClient();

    // 1. Get Chatbot Config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    const originRaw = req.headers.get('origin');
    const corsAllowed =
      originRaw && normalizeOrigin(originRaw)
        ? (() => {
            const origin = normalizeOrigin(originRaw);
            const allowedOrigins = buildAllowedOrigins(config);
            return origin && allowedOrigins.includes(origin)
              ? ({ ok: true as const, origin } as const)
              : ({ ok: false as const } as const);
          })()
        : ({ ok: false as const } as const);

    const cors: Record<string, string> = corsAllowed.ok ? corsHeaders(req, corsAllowed) : {};

    if (originRaw && !corsAllowed.ok) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    if (config.is_active === false) {
      return NextResponse.json({ error: 'Chatbot is inactive' }, { status: 403, headers: cors });
    }

    const ip = getClientIp(req);
    const windowSeconds = 60;
    const perIpGlobal = Number(process.env.CHAT_RATE_LIMIT_IP_PER_MIN ?? 120);
    const perIpPerBot = Number(process.env.CHAT_RATE_LIMIT_IP_BOT_PER_MIN ?? 30);
    const perBot = Number(process.env.CHAT_RATE_LIMIT_BOT_PER_MIN ?? 300);

    const g1 = await checkLimit(supabase, `chat:ip:${ip}`, windowSeconds, perIpGlobal);
    if (!g1.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...cors, 'Retry-After': '60' } }
      );
    }

    const g2 = await checkLimit(supabase, `chat:bot:${chatbotId}:ip:${ip}`, windowSeconds, perIpPerBot);
    if (!g2.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...cors, 'Retry-After': '60' } }
      );
    }

    const g3 = await checkLimit(supabase, `chat:bot:${chatbotId}`, windowSeconds, perBot);
    if (!g3.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...cors, 'Retry-After': '60' } }
      );
    }

    // 2. RAG: Search for relevant context
    const isContactIntent = /\b(contact|email|e-mail|phone|call|book|booking|schedule|consultation|quote|proposal|reach)\b/i.test(
      msg
    );
    const retrievalQuery = isContactIntent
      ? `${msg}\n\nContact details: email, phone, address, booking link, contact form, consultation.`
      : msg;

    const embedding = await generateEmbedding(retrievalQuery);
    const { data: chunksPrimaryRaw } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_threshold: 0.2,
      match_count: 8,
      p_chatbot_id: chatbotId,
    });

    const chunksPrimary: MatchChunkRow[] = Array.isArray(chunksPrimaryRaw)
      ? (chunksPrimaryRaw as MatchChunkRow[])
      : [];

    const { data: chunksFallbackRaw } =
      chunksPrimary.length < 3
        ? await supabase.rpc('match_chunks', {
            query_embedding: embedding,
            match_threshold: 0.1,
            match_count: 12,
            p_chatbot_id: chatbotId,
          })
        : { data: null };

    const chunksFallback: MatchChunkRow[] = Array.isArray(chunksFallbackRaw)
      ? (chunksFallbackRaw as MatchChunkRow[])
      : [];

    const chunks = chunksPrimary.length ? chunksPrimary : chunksFallback;
    const context = chunks.map((c) => String(c.content ?? '')).join('\n\n---\n\n') || '';
    const sourceUrls = Array.from(
      new Set(
        chunks
          .map((c) => (typeof c.source_url === 'string' ? c.source_url.trim() : ''))
          .filter(Boolean)
      )
    ).slice(0, 4);

    // 3. Prepare or Get Session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          chatbot_id: chatbotId,
          ...(typeof leadName === 'string' && leadName.trim() ? { lead_name: leadName.trim().slice(0, 120) } : {}),
          ...(typeof leadEmail === 'string' && leadEmail.trim() ? { lead_email: leadEmail.trim().slice(0, 200) } : {}),
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      currentSessionId = session.id;
    } else {
      const nextLeadName = typeof leadName === 'string' ? leadName.trim() : '';
      const nextLeadEmail = typeof leadEmail === 'string' ? leadEmail.trim() : '';
      if (nextLeadName || nextLeadEmail) {
        await supabase
          .from('chat_sessions')
          .update({
            ...(nextLeadName ? { lead_name: nextLeadName.slice(0, 120) } : {}),
            ...(nextLeadEmail ? { lead_email: nextLeadEmail.slice(0, 200) } : {}),
          })
          .eq('id', currentSessionId);
      }
    }

    const perSession = Number(process.env.CHAT_RATE_LIMIT_SESSION_PER_MIN ?? 60);
    const g4 = await checkLimit(supabase, `chat:bot:${chatbotId}:session:${currentSessionId}`, windowSeconds, perSession);
    if (!g4.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...cors, 'Retry-After': '60' } }
      );
    }

    // 4. Save User Message
    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      role: 'user',
      content: msg
    });

    // 5. Get History (optional but recommended for better conversation)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const historyMessages =
      (Array.isArray(history) ? (history as HistoryRow[]) : [])
        .map((m) => {
          const roleRaw = typeof m.role === 'string' ? m.role : '';
          const role: ChatRole =
            roleRaw === 'assistant' ? 'assistant' : roleRaw === 'system' ? 'system' : 'user';
          const content = typeof m.content === 'string' ? m.content : '';
          return { role, content };
        })
        .filter((m) => m.content);

    // 6. OpenAI Streaming
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are ${config.persona_name || 'an AI assistant'} for ${config.business_name || 'this website'}.
          
    RULES:
    - ONLY answer using the context provided below. Do not use outside knowledge.
    - If the answer is not in the context, say: "I don't have that information, but you can contact us for help."
    - Never make up facts, prices, dates, or links.
    - Do not include any URLs in your answer. Do not include a "Sources" section.
    - If asked about past clients/portfolio (e.g., "Have you worked with restaurants?") and the context doesn't explicitly confirm it, say you don't have confirmed examples.
    - Keep answers concise and helpful.
    - Speak in a ${config.tone || 'professional'} tone.
    - If asked something off-topic or unrelated to the business, politely redirect.

    CONTEXT FROM WEBSITE:
    ${context}
`,
        },
        ...historyMessages,
      ],
    });

    // 7. Stream response to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let assistantContent = '';

        // First, send the session ID
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`));

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            assistantContent += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        if (sourceUrls.length) {
          const sourcesText = `\n\nSources:\n${sourceUrls.map((u) => `- ${u}`).join('\n')}`;
          assistantContent += sourcesText;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: sourcesText })}\n\n`));
        }

        // Save Assistant Message
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: assistantContent
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
