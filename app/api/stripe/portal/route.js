import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { profile } = auth;

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
  }

  try {
    const origin = request.headers.get('origin') || 'https://confess.center';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/premium`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('POST /api/stripe/portal:', err.message);
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
  }
}
