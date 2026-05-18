import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_APP_URL' }, { status: 500 });

    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const customerId = typeof profile?.stripe_customer_id === 'string' ? profile.stripe_customer_id : '';
    if (!customerId) return NextResponse.json({ error: 'Missing stripe_customer_id' }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

