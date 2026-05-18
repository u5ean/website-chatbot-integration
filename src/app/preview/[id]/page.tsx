import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: chatbot } = await supabase
    .from('chatbot_configs')
    .select('id,is_active')
    .eq('id', id)
    .single();

  if (!chatbot) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://xeplyai.up.railway.app/';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold">Widget Preview</div>
          <div className="mt-1 text-xs text-gray-500">
            Preview mode opens the chat automatically.
          </div>
          {!chatbot.is_active && (
            <div className="mt-2 text-xs text-red-700">
              This chatbot is currently paused.
            </div>
          )}
        </div>
      </div>

      <script
        src={`${appUrl}/widget.js`}
        data-chatbot-id={id}
        data-api-url={appUrl}
        data-open="true"
        data-hide-bubble="true"
        data-hide-close="true"
        async
      />
    </div>
  );
}
