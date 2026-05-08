import { NextResponse } from 'next/server';
import { crawlWebsite } from '@/lib/crawler';
import { extractBusinessInfo } from '@/lib/extractor';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { websiteUrl } = await req.json();

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    // 1. Crawl the website
    const pages = await crawlWebsite(websiteUrl);

    if (pages.length === 0) {
      return NextResponse.json({ error: 'Could not crawl website. Make sure the URL is valid.' }, { status: 400 });
    }

    // 2. Extract business info
    const businessInfo = await extractBusinessInfo(pages);

    return NextResponse.json({
      pages: pages.length,
      businessInfo,
      // We don't save to knowledge_chunks yet, user needs to review first
    });
  } catch (error: any) {
    console.error('Onboarding crawl error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
