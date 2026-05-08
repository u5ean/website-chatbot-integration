import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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
    'is_active',
  ];

  for (const k of allowed) {
    if (k in input) out[k] = input[k];
  }

  return out;
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
    const updates = pickUpdatable(body);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chatbot_configs')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ chatbot: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

