import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-helpers';

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ profile: auth.profile });
}
