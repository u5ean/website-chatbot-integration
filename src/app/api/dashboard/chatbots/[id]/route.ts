import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/openai';

export const runtime = 'nodejs';

type ManualFaq = {
  id: string;
  question: string;
  answer: string;
};

function pickUpdatable(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const allowed = [
    'name',
    'tone',
    'persona_name',
    'language',
    'avatar_url',
    'colors',
    'bubble_position',
    'welcome_message',
    'starter_questions',
    'lead_capture_enabled',
    'handoff_url',
    'allowed_origins',
    'is_active',
  ];

  for (const k of allowed) {
    if (k in input) out[k] = input[k];
  }

  return out;
}

async function requireOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chatbotId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401 as const, error: 'Unauthorized' };

  const { data: chatbot, error } = await supabase
    .from('chatbot_configs')
    .select('id,user_id')
    .eq('id', chatbotId)
    .single();

  if (error || !chatbot) return { ok: false as const, status: 404 as const, error: 'Chatbot not found' };
  if (chatbot.user_id !== user.id) return { ok: false as const, status: 403 as const, error: 'Forbidden' };

  return { ok: true as const };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const owner = await requireOwner(supabase, id);
    if (!owner.ok) return NextResponse.json({ error: owner.error }, { status: owner.status });

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('knowledge_chunks')
      .select('id,metadata')
      .eq('chatbot_id', id)
      .contains('metadata', { kind: 'manual_faq' })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const faqs: ManualFaq[] = (Array.isArray(data) ? data : [])
      .map((row) => {
        const m = row.metadata as unknown;
        const obj = typeof m === 'object' && m !== null ? (m as Record<string, unknown>) : {};
        const question = typeof obj.question === 'string' ? obj.question : '';
        const answer = typeof obj.answer === 'string' ? obj.answer : '';
        if (!question || !answer) return null;
        return { id: String(row.id), question, answer };
      })
      .filter((x): x is ManualFaq => Boolean(x));

    return NextResponse.json({ faqs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const faqAddRaw = body.faq_add as unknown;
    const faqDeleteId = body.faq_delete_id as unknown;

    const owner = await requireOwner(supabase, id);
    if (!owner.ok) return NextResponse.json({ error: owner.error }, { status: owner.status });

    const updates = pickUpdatable(body);
    const admin = await createAdminClient();

    let faqAdded: ManualFaq | null = null;
    let faqDeletedId: string | null = null;

    if (faqAddRaw && typeof faqAddRaw === 'object') {
      const obj = faqAddRaw as Record<string, unknown>;
      const question = typeof obj.question === 'string' ? obj.question.trim() : '';
      const answer = typeof obj.answer === 'string' ? obj.answer.trim() : '';
      if (!question || !answer) {
        return NextResponse.json({ error: 'FAQ question and answer are required' }, { status: 400 });
      }

      const q = question.slice(0, 300);
      const a = answer.slice(0, 2000);
      const content = `FAQ\nQ: ${q}\nA: ${a}`;
      const embedding = await generateEmbedding(content);

      const { data: inserted, error: insertError } = await admin
        .from('knowledge_chunks')
        .insert({
          chatbot_id: id,
          content,
          embedding,
          source_url: null,
          metadata: { kind: 'manual_faq', question: q, answer: a },
        })
        .select('id')
        .single();

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
      faqAdded = { id: String(inserted.id), question: q, answer: a };
    }

    if (typeof faqDeleteId === 'string' && faqDeleteId.trim()) {
      const delId = faqDeleteId.trim();
      const { error: delError } = await admin
        .from('knowledge_chunks')
        .delete()
        .eq('id', delId)
        .eq('chatbot_id', id);
      if (delError) return NextResponse.json({ error: delError.message }, { status: 400 });
      faqDeletedId = delId;
    }

    if (Object.keys(updates).length === 0 && !faqAdded && !faqDeletedId) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    let chatbot: unknown = null;
    if (Object.keys(updates).length) {
      const { data, error } = await supabase
        .from('chatbot_configs')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      chatbot = data;
    }

    return NextResponse.json({ chatbot, faqAdded, faqDeletedId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('chatbot_configs')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deletedId: data[0]?.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

