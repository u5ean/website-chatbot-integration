import { createClient } from '@/lib/supabase/server';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

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
            <h3 className="text-xl font-bold mt-1 capitalize">{profile?.subscription_tier || 'Free'}</h3>
          </div>
          <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Upgrade Plan
          </button>
        </div>
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Messages this month</p>
              <p className="text-2xl font-bold">124 / 500</p>
              <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                <div className="bg-black h-2 rounded-full w-[25%]" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Chatbots</p>
              <p className="text-2xl font-bold">1 / 1</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next billing date</p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4">Subscription Tiers</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Free', price: '$0', features: ['1 Chatbot', '500 messages/mo', 'Basic RAG'] },
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
            <button className="w-full py-2 border border-black rounded-lg text-sm font-semibold hover:bg-gray-50">
              {tier.name === (profile?.subscription_tier || 'Free') ? 'Current Plan' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
