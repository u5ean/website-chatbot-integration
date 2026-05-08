import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (!data.is_active) {
      return NextResponse.json({ error: 'Chatbot is inactive' }, { status: 403 });
    }

    // Return only public configuration
    return NextResponse.json({
      name: data.persona_name || data.name,
      welcome_message: data.welcome_message,
      colors: data.colors,
      bubble_position: data.bubble_position,
      avatar_url: data.avatar_url,
      starter_questions: data.starter_questions,
      lead_capture_enabled: data.lead_capture_enabled
    }, { headers: corsHeaders(req) });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(req) });
  }
}
