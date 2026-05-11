import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfigForm from './ConfigForm';
import DeleteButton from './DeleteButton';

export default async function ChatbotConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: chatbot } = await supabase
    .from('chatbot_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (!chatbot) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{chatbot.name}</h1>
          <div className="text-sm text-gray-500">{chatbot.website_url}</div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/chatbots/${chatbot.id}/history`}
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            History
          </Link>
          <Link
            href={`/preview/${chatbot.id}`}
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            Preview
          </Link>
          <Link
            href={`/dashboard/chatbots/${chatbot.id}/embed`}
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            Embed
          </Link>
          <DeleteButton chatbotId={chatbot.id} />
        </div>
        
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_520px] gap-6">
        <div>
          <ConfigForm chatbot={chatbot as any} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold">Live Preview</div>
          <iframe
            title="Chatbot preview"
            src={`/preview/${chatbot.id}`}
            className="w-full h-[560px] bg-white"
          />
        </div>
      </div>
    </div>
  );
}
