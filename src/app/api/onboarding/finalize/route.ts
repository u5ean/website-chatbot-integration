import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function chatbotLimitForTier(tier: string | null | undefined) {
  const t = typeof tier === 'string' ? tier.toLowerCase() : 'free';
  if (t === 'agency') return 999;
  if (t === 'pro') return 3;
  return 1;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const limit = chatbotLimitForTier(profile?.subscription_tier ?? 'free');
    const { count } = await supabase
      .from('chatbot_configs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const chatbotCount = typeof count === 'number' ? count : 0;
    if (chatbotCount >= limit) {
      return NextResponse.json(
        { error: 'Chatbot limit reached. Upgrade your plan to create more chatbots.' },
        { status: 402 }
      );
    }

    const body = await req.json();
    const { websiteUrl, name, config } = body;
    const { primary_color, ...safeConfig } = (config ?? {}) as Record<string, unknown>;
    const colors =
      (safeConfig as any).colors ??
      (typeof primary_color === 'string'
        ? { primary: primary_color, text: '#ffffff' }
        : undefined);

    // 1. Create chatbot config
    const { data: chatbot, error: configError } = await supabase
      .from('chatbot_configs')
      .insert({
        user_id: user.id,
        website_url: websiteUrl,
        name: name,
        ...safeConfig,
        ...(colors ? { colors } : {}),
      })
      .select()
      .single();

    if (configError) throw configError;

    const chatbotId = chatbot.id;
    const { data: job, error: jobError } = await supabase
      .from('crawl_jobs')
      .insert({
        chatbot_id: chatbotId,
        user_id: user.id,
        kind: 'onboarding',
        status: 'queued',
        max_pages: 50,
      })
      .select('id')
      .single();

    if (jobError || !job) throw new Error(jobError?.message || 'Failed to queue job');

    return NextResponse.json({
      success: true,
      chatbotId,
      indexing: true,
      jobId: job.id,
    });
  } catch (error: unknown) {
    console.error('Finalize onboarding error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
