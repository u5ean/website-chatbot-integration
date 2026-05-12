import { createAdminClient, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_tier: string | null;
  created_at: string;
};

export default async function DashboardSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let profile: Profile | null = null;
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id,email,stripe_customer_id,subscription_tier,created_at')
    .eq('id', user.id)
    .single();

  if (profileData) {
    profile = profileData as Profile;
  } else {
    const admin = await createAdminClient();
    await admin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
        },
        { onConflict: 'id' }
      );

    const { data: createdProfile } = await supabase
      .from('profiles')
      .select('id,email,stripe_customer_id,subscription_tier,created_at')
      .eq('id', user.id)
      .single();
    if (createdProfile) profile = createdProfile as Profile;
  }

  const tier = (profile?.subscription_tier || 'free').toString();
  const stripeCustomerId = profile?.stripe_customer_id || '';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Account</h2>
        <p className="text-gray-500">Manage your account and subscription details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Profile</div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-sm font-medium text-gray-900">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">User ID</div>
              <div className="text-sm font-mono text-gray-900 break-all">{user.id}</div>
            </div>
            <div className="pt-2">
              <form action="/auth/signout" method="post">
                <button className="text-sm font-medium text-red-600 hover:underline">Sign out</button>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Subscription</div>
              <div className="mt-1 text-xl font-bold capitalize">{tier}</div>
            </div>
            <Link
              href="/dashboard/billing"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-black text-white hover:bg-gray-800"
            >
              Manage billing
            </Link>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-xs text-gray-500">Stripe Customer</div>
              <div className="text-sm text-gray-900 font-mono break-all">
                {stripeCustomerId ? stripeCustomerId : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Profile Created</div>
              <div className="text-sm text-gray-900">
                {profile?.created_at ? new Date(profile.created_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Notes</div>
        </div>
        <div className="p-6 space-y-2 text-sm text-gray-700">
          <div>Billing upgrades are shown on the Billing page.</div>
          <div>To update chatbot behavior, open a specific chatbot and edit its configuration.</div>
        </div>
      </div>
    </div>
  );
}

