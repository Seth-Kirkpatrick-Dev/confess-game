import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user, profile } = auth;

  try {
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await supabaseServer.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?cancelled=true`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('POST /api/stripe/create-checkout:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
