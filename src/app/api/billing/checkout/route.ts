import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function getPlanFromTier(tier: string | null | undefined) {
  const t = typeof tier === 'string' ? tier.toLowerCase() : 'free';
  if (t === 'agency') return 'agency';
  if (t === 'pro') return 'pro';
  return 'free';
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const tierParam = url.searchParams.get('tier') || '';
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const tierRaw = (typeof body.tier === 'string' ? body.tier : tierParam).toLowerCase();
    const tier = tierRaw === 'agency' ? 'agency' : 'pro';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_APP_URL' }, { status: 500 });

    const pricePro = process.env.STRIPE_PRICE_PRO;
    const priceAgency = process.env.STRIPE_PRICE_AGENCY;
    const priceId = tier === 'agency' ? priceAgency : pricePro;
    if (!priceId) return NextResponse.json({ error: 'Missing Stripe price ID env vars' }, { status: 500 });

    const admin = await createAdminClient();
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id,email,stripe_customer_id,subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile?.id) {
      await admin.from('profiles').insert({
        id: user.id,
        email: user.email ?? null,
        subscription_tier: 'free',
      });
    }

    const stripe = getStripe();
    let customerId = existingProfile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const profileTier = getPlanFromTier(existingProfile?.subscription_tier);
    if (profileTier === tier) {
      return NextResponse.redirect(new URL('/dashboard/billing?already=1', appUrl), { status: 303 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier },
      subscription_data: {
        metadata: { user_id: user.id, tier },
      },
    });

    if (!session.url) return NextResponse.json({ error: 'Stripe session missing URL' }, { status: 500 });
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
