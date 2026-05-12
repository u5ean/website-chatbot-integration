import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: job, error: jobError } = await supabase
      .from('crawl_jobs')
      .insert({
        chatbot_id: id,
        user_id: user.id,
        kind: 'recrawl',
        status: 'queued',
        max_pages: 50,
      })
      .select('id')
      .single();

    if (jobError || !job) return NextResponse.json({ error: jobError?.message || 'Failed to queue job' }, { status: 400 });

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

