import { NextResponse } from 'next/server';
import { openai, generateEmbedding } from '@/lib/openai';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { chatbotId, message, sessionId } = await req.json();

    if (!chatbotId || !message) {
      return NextResponse.json({ error: 'Chatbot ID and message are required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // 1. Get Chatbot Config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // 2. RAG: Search for relevant context
    const embedding = await generateEmbedding(message);
    const { data: chunks, error: matchError } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_threshold: 0.3, // Adjust as needed
      match_count: 5,
      p_chatbot_id: chatbotId
    });

    const context = chunks?.map((c: any) => c.content).join('\n\n') || '';

    // 3. Prepare or Get Session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ chatbot_id: chatbotId })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      currentSessionId = session.id;
    }

    // 4. Save User Message
    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      role: 'user',
      content: message
    });

    // 5. Get History (optional but recommended for better conversation)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    // 6. OpenAI Streaming
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant for a website. 
          Use the following context to answer the user's questions. 
          If you don't know the answer based on the context, say you don't know but try to be helpful.
          
          Tone: ${config.tone || 'professional'}
          Persona Name: ${config.persona_name || 'Assistant'}
          
          Context:
          ${context}`,
        },
        ...(history?.map(m => ({ role: m.role as any, content: m.content })) || []),
      ],
    });

    // 7. Stream response to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let assistantContent = '';

        // First, send the session ID
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`));

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            assistantContent += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Save Assistant Message
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: assistantContent
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
