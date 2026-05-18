import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function tierFromPriceId(priceId: string) {
  const pro = process.env.STRIPE_PRICE_PRO;
  const agency = process.env.STRIPE_PRICE_AGENCY;
  if (agency && priceId === agency) return 'agency';
  if (pro && priceId === pro) return 'pro';
  return 'free';
}

async function upsertProfileByCustomerId(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  stripeCustomerId: string,
  patch: Record<string, unknown>
) {
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (!profile?.id) return false;
  const { error } = await admin.from('profiles').update(patch).eq('id', profile.id);
  if (error) throw new Error(error.message);
  return true;
}

export async function POST(req: Request) {
  try {
    const sig = req.headers.get('stripe-signature') || '';
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!sig || !secret) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 400 });

    const rawBody = await req.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

    const admin = await createAdminClient();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const customerId = typeof session?.customer === 'string' ? session.customer : '';
      const subscriptionId = typeof session?.subscription === 'string' ? session.subscription : '';
      const metaUserId = typeof session?.metadata?.user_id === 'string' ? session.metadata.user_id : '';
      const tierMeta = typeof session?.metadata?.tier === 'string' ? session.metadata.tier : '';

      if (metaUserId) {
        await admin
          .from('profiles')
          .update({
            ...(customerId ? { stripe_customer_id: customerId } : {}),
            ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
            ...(tierMeta ? { subscription_tier: tierMeta } : {}),
          })
          .eq('id', metaUserId);
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as any;
      const customerId = typeof sub?.customer === 'string' ? sub.customer : '';
      const subscriptionId = typeof sub?.id === 'string' ? sub.id : '';
      const status = typeof sub?.status === 'string' ? sub.status : '';
      const periodEnd = typeof sub?.current_period_end === 'number' ? sub.current_period_end : null;
      const priceId = typeof sub?.items?.data?.[0]?.price?.id === 'string' ? sub.items.data[0].price.id : '';
      const tier = priceId ? tierFromPriceId(priceId) : 'free';

      if (customerId) {
        await upsertProfileByCustomerId(admin, customerId, {
          stripe_subscription_id: subscriptionId || null,
          stripe_price_id: priceId || null,
          subscription_status: status || null,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          subscription_tier: tier,
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as any;
      const customerId = typeof sub?.customer === 'string' ? sub.customer : '';
      const status = typeof sub?.status === 'string' ? sub.status : 'canceled';
      if (customerId) {
        await upsertProfileByCustomerId(admin, customerId, {
          stripe_subscription_id: null,
          stripe_price_id: null,
          subscription_status: status,
          current_period_end: null,
          subscription_tier: 'free',
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

