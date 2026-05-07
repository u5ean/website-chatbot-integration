import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { crawlWebsite } from '@/lib/crawler';
import { processAndStoreKnowledge } from '@/lib/knowledge';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { websiteUrl, name, config } = body;

    // 1. Create chatbot config
    const { data: chatbot, error: configError } = await supabase
      .from('chatbot_configs')
      .insert({
        user_id: user.id,
        website_url: websiteUrl,
        name: name,
        ...config
      })
      .select()
      .single();

    if (configError) throw configError;

    // 2. Start background processing (crawling and embedding)
    // In a real production app, you'd use a background worker (e.g., Inngest, Upstash QStash)
    // For this implementation, we'll run it and return the ID.
    // Note: This might timeout on Vercel hobby plan if it takes > 10s.
    
    // We crawl again to get the full content for all pages
    const pages = await crawlWebsite(websiteUrl);
    
    // Process and store knowledge (embeddings)
    await processAndStoreKnowledge(chatbot.id, pages);

    return NextResponse.json({
      success: true,
      chatbotId: chatbot.id
    });
  } catch (error: any) {
    console.error('Finalize onboarding error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
