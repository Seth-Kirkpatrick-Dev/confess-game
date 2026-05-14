import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

const VALID_SLOTS = new Set(['name_color','border','theme','avatar_accessory','badge_frame']);

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { slot, cosmetic_id } = await request.json();

    if (!VALID_SLOTS.has(slot)) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }

    if (cosmetic_id === null) {
      // Unequip
      await supabaseServer.from('user_equipped').delete().eq('user_id', user.id).eq('slot', slot);
      await clearDenormalized(user.id, slot);
      return NextResponse.json({ success: true });
    }

    // Verify user owns this cosmetic
    const { data: owned, error: ownErr } = await supabaseServer
      .from('user_cosmetics')
      .select('cosmetic_id, cosmetics(category, preview_class, economy_tier)')
      .eq('user_id', user.id)
      .eq('cosmetic_id', cosmetic_id)
      .maybeSingle();

    if (ownErr) throw ownErr;
    if (!owned) return NextResponse.json({ error: 'You do not own this item' }, { status: 403 });

    const cosmetic = owned.cosmetics;
    if (cosmetic.category !== slot) {
      return NextResponse.json({ error: 'This item does not fit that slot' }, { status: 400 });
    }

    // Upsert equipped slot
    await supabaseServer
      .from('user_equipped')
      .upsert({ user_id: user.id, slot, cosmetic_id }, { onConflict: 'user_id,slot' });

    // Denormalize visible fields to profiles for fast display
    await updateDenormalized(user.id, slot, cosmetic.preview_class);

    return NextResponse.json({ success: true, preview_class: cosmetic.preview_class });
  } catch (err) {
    console.error('POST /api/profile/equip:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function updateDenormalized(userId, slot, previewClass) {
  const col = slot === 'name_color' ? 'equipped_name_color_class'
            : slot === 'border'     ? 'equipped_border_class'
            : null;
  if (!col) return; // other slots don't have denormalized columns yet
  await supabaseServer.from('profiles').update({ [col]: previewClass }).eq('id', userId);
}

async function clearDenormalized(userId, slot) {
  const col = slot === 'name_color' ? 'equipped_name_color_class'
            : slot === 'border'     ? 'equipped_border_class'
            : null;
  if (!col) return;
  await supabaseServer.from('profiles').update({ [col]: null }).eq('id', userId);
}
