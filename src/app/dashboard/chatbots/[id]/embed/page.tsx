import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: chatbot } = await supabase
    .from('chatbot_configs')
    .select('id,name,website_url,is_active,created_at')
    .eq('id', id)
    .single();

  if (!chatbot) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const embed = `<script src="${appUrl}/widget.js" data-chatbot-id="${chatbot.id}" data-api-url="${appUrl}" async></script>`;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Embed</h2>
        <p className="text-gray-500">Copy/paste this script tag into your website.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{chatbot.name}</div>
            <div className="text-sm text-gray-500">{chatbot.website_url}</div>
          </div>
          <div className="text-sm">
            <span className={chatbot.is_active ? 'text-green-600' : 'text-gray-500'}>
              {chatbot.is_active ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 font-mono text-sm whitespace-pre-wrap break-words">
          {embed}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-lg font-bold">Quick Test (Local)</h3>
        <p className="text-sm text-gray-600">
          Paste this into any HTML page to test quickly:
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 font-mono text-sm whitespace-pre-wrap break-words">
{`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Widget Test</title>
  </head>
  <body>
    <h1>Widget Test</h1>
    ${embed}
  </body>
</html>`}
        </div>
      </div>
    </div>
  );
}

