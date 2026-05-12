import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { crawlWebsite } from '@/lib/crawler';
import { processAndStoreKnowledge } from '@/lib/knowledge';

export const runtime = 'nodejs';

type ClaimedJob = {
  id: string;
  chatbot_id: string;
  user_id: string;
  kind: 'onboarding' | 'recrawl';
  max_pages: number | null;
};

function requireWorkerSecret(req: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  if (!expected) return { ok: false as const, status: 500 as const, error: 'Missing JOB_WORKER_SECRET' };
  const provided = req.headers.get('x-worker-secret') ?? '';
  if (provided !== expected) return { ok: false as const, status: 401 as const, error: 'Unauthorized' };
  return { ok: true as const };
}

export async function POST(req: Request) {
  const auth = requireWorkerSecret(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = await createAdminClient();

  const { data: claimedRaw, error: claimError } = await admin.rpc('claim_next_crawl_job');
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 400 });

  const claimed: ClaimedJob | null =
    Array.isArray(claimedRaw) && claimedRaw.length
      ? (claimedRaw[0] as ClaimedJob)
      : !Array.isArray(claimedRaw) && claimedRaw
        ? (claimedRaw as ClaimedJob)
        : null;

  if (!claimed?.id) {
    return NextResponse.json({ ok: true, processed: false });
  }

  try {
    const { data: chatbot, error: botError } = await admin
      .from('chatbot_configs')
      .select('id,website_url')
      .eq('id', claimed.chatbot_id)
      .single();

    if (botError || !chatbot) throw new Error('Chatbot not found');

    const pages = await crawlWebsite(chatbot.website_url, claimed.max_pages ?? 50);

    await admin
      .from('knowledge_chunks')
      .delete()
      .eq('chatbot_id', claimed.chatbot_id)
      .not('source_url', 'is', null);

    await processAndStoreKnowledge(claimed.chatbot_id, pages);

    await admin
      .from('crawl_jobs')
      .update({
        status: 'succeeded',
        pages_crawled: pages.length,
        finished_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', claimed.id);

    return NextResponse.json({
      ok: true,
      processed: true,
      jobId: claimed.id,
      chatbotId: claimed.chatbot_id,
      pages: pages.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Job failed';
    await admin
      .from('crawl_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        last_error: message,
      })
      .eq('id', claimed.id);

    return NextResponse.json({ ok: false, processed: true, jobId: claimed.id, error: message }, { status: 500 });
  }
}

