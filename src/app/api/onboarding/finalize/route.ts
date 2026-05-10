import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { crawlWebsite } from '@/lib/crawler';
import { processAndStoreKnowledge } from '@/lib/knowledge';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    setTimeout(() => {
      void (async () => {
        try {
          const pages = await crawlWebsite(websiteUrl);
          await processAndStoreKnowledge(chatbotId, pages);
        } catch (e) {
          console.error('Finalize onboarding background error:', e);
        }
      })();
    }, 0);

    return NextResponse.json({
      success: true,
      chatbotId,
      indexing: true,
    });
  } catch (error: any) {
    console.error('Finalize onboarding error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
