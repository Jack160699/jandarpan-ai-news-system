import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
for (const line of fs.readFileSync('.env.production.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (v && v !== '[SENSITIVE]') process.env[k] = v;
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('=== AUTH USERS ===');
  console.log(JSON.stringify(users?.users?.map(u => ({ id: u.id, email: u.email, phone: u.phone, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })), null, 2));

  const { data: likes } = await supabase.from('story_likes').select('*');
  console.log('=== STORY LIKES ===');
  console.log(JSON.stringify(likes, null, 2));

  const { data: comments } = await supabase.from('story_comments').select('*');
  console.log('=== STORY COMMENTS ===');
  console.log(JSON.stringify(comments, null, 2));
}

main().catch(console.error);
