import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { crawlWebsite } from '@/lib/crawler';
import { processAndStoreKnowledge } from '@/lib/knowledge';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: chatbot, error } = await supabase
      .from('chatbot_configs')
      .select('id,website_url')
      .eq('id', id)
      .single();

    if (error || !chatbot) return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });

    const admin = await createAdminClient();
    await admin.from('knowledge_chunks').delete().eq('chatbot_id', id);

    const pages = await crawlWebsite(chatbot.website_url);
    await processAndStoreKnowledge(id, pages);

    return NextResponse.json({ ok: true, pages: pages.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

