import { NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from('generated_articles')
    .update({ workflow_status: 'draft', editorial_status: 'rejected' })
    .eq('workflow_status', 'scheduled')
    .is('published_at', null);

  return NextResponse.json({ ok: !error, data, error });
}
