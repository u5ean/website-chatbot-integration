import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('crawl_jobs')
      .select('id,chatbot_id,kind,status,max_pages,attempts,pages_crawled,last_error,started_at,finished_at,created_at')
      .eq('id', jobId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ job: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

