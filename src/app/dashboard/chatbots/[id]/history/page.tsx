import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TagsEditor from './TagsEditor';

type Message = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string; q?: string }>;
}) {
  const { id } = await params;
  const { session, q } = await searchParams;
  const supabase = await createClient();

  const { data: chatbot } = await supabase
    .from('chatbot_configs')
    .select('id,name,website_url')
    .eq('id', id)
    .single();

  if (!chatbot) notFound();

  let sessionsQuery = supabase
    .from('chat_sessions')
    .select('id,visitor_id,lead_name,lead_email,lead_tags,created_at')
    .eq('chatbot_id', id);

  const qTrim = (q ?? '').trim();
  if (qTrim) {
    const pattern = `%${qTrim}%`;
    sessionsQuery = sessionsQuery.or(
      `lead_email.ilike.${pattern},lead_name.ilike.${pattern},visitor_id.ilike.${pattern}`
    );
  }

  const { data: sessions } = await sessionsQuery.order('created_at', { ascending: false }).limit(50);

  const activeSessionId = session || sessions?.[0]?.id;
  const activeSession = sessions?.find((s: any) => s.id === activeSessionId) as any;

  let messages: Message[] = [];
  if (activeSessionId) {
    const { data } = await supabase
      .from('chat_messages')
      .select('id,session_id,role,content,created_at')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: true })
      .limit(200);
    messages = (data ?? []) as any;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conversation History</h2>
          <p className="text-gray-500">{chatbot.name}</p>
        </div>
        <Link
          href={`/dashboard/chatbots/${id}`}
          className="text-sm font-medium text-gray-700 hover:underline"
        >
          Back to config
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="font-semibold">Sessions</div>
            <form className="mt-2" action="" method="get">
              <input type="hidden" name="session" value={activeSessionId ?? ''} />
              <input
                name="q"
                defaultValue={qTrim}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Search by email / name / visitor id"
              />
            </form>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {sessions?.map((s) => {
              const label =
                s.lead_email ||
                s.lead_name ||
                s.visitor_id ||
                new Date(s.created_at).toLocaleString();
              const isActive = s.id === activeSessionId;
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/chatbots/${id}/history?session=${s.id}`}
                  className={`block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${
                    isActive ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">{label}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </Link>
              );
            })}

            {(!sessions || sessions.length === 0) && (
              <div className="px-4 py-6 text-sm text-gray-500">No sessions yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold">Messages</div>
          <div className="p-4 border-b border-gray-100">
            {activeSessionId && (
              <TagsEditor
                chatbotId={id}
                sessionId={activeSessionId}
                initialTags={(activeSession?.lead_tags ?? []) as string[]}
              />
            )}
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-auto bg-gray-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'ml-auto bg-black text-white rounded-br-md'
                    : 'mr-auto bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                }`}
              >
                {m.content}
              </div>
            ))}

            {activeSessionId && messages.length === 0 && (
              <div className="text-sm text-gray-500">No messages in this session.</div>
            )}
            {!activeSessionId && (
              <div className="text-sm text-gray-500">Select a session to view messages.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
