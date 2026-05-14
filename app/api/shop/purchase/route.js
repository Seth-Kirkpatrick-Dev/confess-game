import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { cosmetic_id } = await request.json();
    if (!cosmetic_id) return NextResponse.json({ error: 'cosmetic_id required' }, { status: 400 });

    const { data: result, error } = await supabaseServer.rpc('purchase_cosmetic', {
      user_id_param: user.id,
      cosmetic_id_param: cosmetic_id,
    });

    if (error) throw error;

    if (result === 'ok') {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('spendable_points')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ success: true, spendable_points: profile?.spendable_points });
    }

    const messages = {
      already_owned:        'You already own this item',
      insufficient_points:  'Not enough points',
      not_purchasable:      'This item cannot be purchased with points',
      not_found:            'Item not found',
    };

    return NextResponse.json(
      { error: messages[result] || 'Purchase failed' },
      { status: result === 'already_owned' ? 409 : result === 'insufficient_points' ? 402 : 400 }
    );
  } catch (err) {
    console.error('POST /api/shop/purchase:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
