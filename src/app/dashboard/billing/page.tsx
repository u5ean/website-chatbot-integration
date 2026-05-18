import { createAdminClient, createClient } from '@/lib/supabase/server';

function normalizeTier(tier: string | null | undefined) {
  const t = typeof tier === 'string' ? tier.toLowerCase() : 'free';
  if (t === 'agency') return 'Agency';
  if (t === 'pro') return 'Pro';
  return 'Free';
}

function limitsForTier(tier: string) {
  const t = tier.toLowerCase();
  if (t === 'agency') return { chatbots: 999, messages: 50000 };
  if (t === 'pro') return { chatbots: 3, messages: 5000 };
  return { chatbots: 1, messages: 100 };
}

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .maybeSingle();

  const tierName = normalizeTier(profile?.subscription_tier);
  const limits = limitsForTier(tierName);

  const chatbotCountRes = await supabase
    .from('chatbot_configs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '');

  const chatbotCount = typeof chatbotCountRes.count === 'number' ? chatbotCountRes.count : 0;

  const admin = await createAdminClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: monthly } = user?.id
    ? await admin
        .from('user_monthly_usage')
        .select('messages_used')
        .eq('user_id', user.id)
        .eq('month_start', monthStart.toISOString().slice(0, 10))
        .maybeSingle()
    : { data: null as any };

  const messagesUsed = typeof monthly?.messages_used === 'number' ? monthly.messages_used : 0;
  const pct = limits.messages ? Math.min(100, Math.round((messagesUsed / limits.messages) * 100)) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <p className="text-gray-500">Manage your plan and usage.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Plan</p>
            <h3 className="text-xl font-bold mt-1">{tierName}</h3>
          </div>
          <div className="flex items-center gap-3">
            {tierName === 'Free' ? (
              <form method="POST" action="/api/billing/checkout?tier=pro">
                <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold">
                  Upgrade
                </button>
              </form>
            ) : (
              <form method="POST" action="/api/billing/portal">
                <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold">
                  Manage billing
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Messages this month</p>
              <p className="text-2xl font-bold">{messagesUsed} / {limits.messages}</p>
              <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                <div className="bg-black h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Chatbots</p>
              <p className="text-2xl font-bold">{chatbotCount} / {limits.chatbots >= 999 ? '∞' : limits.chatbots}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next billing date</p>
              <p className="text-2xl font-bold">
                {profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4">Subscription Tiers</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Free', price: '$0', features: ['1 Chatbot', '100 messages/mo', 'Basic RAG'] },
          { name: 'Pro', price: '$29', features: ['3 Chatbots', '5,000 messages/mo', 'Advanced RAG', 'Lead Capture'] },
          { name: 'Agency', price: '$99', features: ['Unlimited Chatbots', '50,000 messages/mo', 'Priority Support', 'White-label'] },
        ].map((tier) => (
          <div key={tier.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h4 className="font-bold text-lg mb-1">{tier.name}</h4>
            <p className="text-3xl font-bold mb-4">{tier.price}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  {f}
                </li>
              ))}
            </ul>
            {tier.name === tierName ? (
              <button disabled className="w-full py-2 border border-black rounded-lg text-sm font-semibold bg-gray-50">
                Current Plan
              </button>
            ) : tier.name === 'Free' ? (
              <form method="POST" action="/api/billing/portal">
                <button className="w-full py-2 border border-black rounded-lg text-sm font-semibold hover:bg-gray-50">
                  Manage billing
                </button>
              </form>
            ) : (
              <form method="POST" action={`/api/billing/checkout?tier=${tier.name.toLowerCase()}`}>
                <button className="w-full py-2 border border-black rounded-lg text-sm font-semibold hover:bg-gray-50">
                  Select Plan
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
