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
      .select('cosmetic_id, cosmetics(category, preview_class, config_json, economy_tier)')
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
    await updateDenormalized(user.id, slot, cosmetic.preview_class, cosmetic.config_json);

    return NextResponse.json({ success: true, preview_class: cosmetic.preview_class });
  } catch (err) {
    console.error('POST /api/profile/equip:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const THEME_ACCENTS = { midnight: '#1e3a5f', cyberpunk: '#7c2d00' };

async function updateDenormalized(userId, slot, previewClass, configJson) {
  const cfg = configJson || {};
  const update =
    slot === 'name_color'       ? { equipped_name_color_class: previewClass }
    : slot === 'border'         ? { equipped_border_class: previewClass }
    : slot === 'avatar_accessory' ? { equipped_avatar_emoji: cfg.emoji || null }
    : slot === 'badge_frame'    ? { equipped_badge_frame_class: previewClass }
    : slot === 'theme'          ? { equipped_accent_color: cfg.accent || THEME_ACCENTS[cfg.theme] || null }
    : null;
  if (!update) return;
  await supabaseServer.from('profiles').update(update).eq('id', userId);
}

async function clearDenormalized(userId, slot) {
  const update =
    slot === 'name_color'         ? { equipped_name_color_class: null }
    : slot === 'border'           ? { equipped_border_class: null }
    : slot === 'avatar_accessory' ? { equipped_avatar_emoji: null }
    : slot === 'badge_frame'      ? { equipped_badge_frame_class: null }
    : slot === 'theme'            ? { equipped_accent_color: null }
    : null;
  if (!update) return;
  await supabaseServer.from('profiles').update(update).eq('id', userId);
}
