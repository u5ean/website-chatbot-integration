import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { lead_tags?: unknown };
    const tagsRaw = Array.isArray(body.lead_tags) ? body.lead_tags : [];
    const lead_tags = tagsRaw
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 12);

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id,chatbot_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session || session.chatbot_id !== id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ lead_tags })
      .eq('id', sessionId)
      .select('id,lead_tags')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ session: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

