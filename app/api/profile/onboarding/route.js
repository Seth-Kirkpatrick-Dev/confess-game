import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  await supabaseServer
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id);

  return NextResponse.json({ success: true });
}
