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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="bg-white">
      <div style={{ padding: 12, maxWidth: 720 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Widget Preview</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          This page loads only the widget.
        </div>
        {!chatbot.is_active && (
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>
            This chatbot is currently paused.
          </div>
        )}
      </div>

      <script src={`${appUrl}/widget.js`} data-chatbot-id={id} data-api-url={appUrl} async />
    </div>
  );
}
