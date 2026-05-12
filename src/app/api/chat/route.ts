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

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  try {
    const { chatbotId, message, sessionId, leadName, leadEmail } = await req.json();

    if (!chatbotId || !message) {
      return NextResponse.json(
        { error: 'Chatbot ID and message are required' },
        { status: 400, headers: corsHeaders(req) }
      );
    }

    const supabase = await createAdminClient();

    // 1. Get Chatbot Config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404, headers: corsHeaders(req) });
    }

    // 2. RAG: Search for relevant context
    const isContactIntent = /\b(contact|email|e-mail|phone|call|book|booking|schedule|consultation|quote|proposal|reach)\b/i.test(
      message
    );
    const retrievalQuery = isContactIntent
      ? `${message}\n\nContact details: email, phone, address, booking link, contact form, consultation.`
      : message;

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

    // 4. Save User Message
    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      role: 'user',
      content: message
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
        ...corsHeaders(req),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}
