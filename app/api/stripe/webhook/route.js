import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function POST(request) {
  const sig = request.headers.get('stripe-signature');
  let event;
  try {
    const buf = Buffer.from(await request.arrayBuffer());
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      await supabaseServer.from('profiles').update({ is_premium: true }).eq('id', userId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const { data: profile } = await supabaseServer
      .from('profiles').select('id').eq('stripe_customer_id', sub.customer).single();
    if (profile) {
      await supabaseServer.from('profiles').update({ is_premium: false }).eq('id', profile.id);
    }
  }

  return NextResponse.json({ received: true });
}
