import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe() {
  if (client) return client;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  client = new Stripe(secret, {
    apiVersion: '2026-04-22.dahlia' as any,
    typescript: true,
  });
  return client;
}
