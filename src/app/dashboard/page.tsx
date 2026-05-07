import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: chatbots } = await supabase
    .from('chatbot_configs')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Chatbots</h2>
          <p className="text-gray-500">Manage and configure your AI assistants.</p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} />
          New Chatbot
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chatbots?.map((chatbot) => (
          <div key={chatbot.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-1">{chatbot.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{chatbot.website_url}</p>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/chatbots/${chatbot.id}`}
                className="text-sm font-medium text-black hover:underline"
              >
                Configure
              </Link>
              <Link
                href={`/dashboard/chatbots/${chatbot.id}/history`}
                className="text-sm font-medium text-gray-500 hover:underline"
              >
                History
              </Link>
              <Link
                href={`/dashboard/chatbots/${chatbot.id}/embed`}
                className="text-sm font-medium text-gray-500 hover:underline"
              >
                Embed
              </Link>
            </div>
          </div>
        ))}

        {chatbots?.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No chatbots found.</p>
            <Link href="/dashboard/new" className="text-black font-semibold hover:underline">
              Create your first chatbot
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
