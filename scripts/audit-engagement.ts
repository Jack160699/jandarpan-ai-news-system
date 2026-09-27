import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

function loadEnvFile(file: string) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!val || val === '[SENSITIVE]') continue;
    process.env[key] = val;
  }
}

loadEnvFile('.env.production.local');
loadEnvFile('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('=== ENGAGEMENT AUDIT START ===\n');

  // 1. Auth Users
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const users = usersData?.users || [];
  console.log(`--- AUTH USERS (Total: ${users.length}) ---`);
  users.forEach(u => {
    console.log(`User: ${u.id} | Email: ${u.email} | Created: ${u.created_at} | LastSignIn: ${u.last_sign_in_at}`);
  });

  // 2. Story Likes
  const { data: likes, error: likesErr } = await supabase.from('story_likes').select('*');
  console.log(`\n--- STORY LIKES (Total: ${likes?.length || 0}) ---`);
  if (likesErr) console.error('Likes error:', likesErr);
  else console.log(JSON.stringify(likes, null, 2));

  // 3. Story Comments
  const { data: comments, error: commErr } = await supabase.from('story_comments').select('*');
  console.log(`\n--- STORY COMMENTS (Total: ${comments?.length || 0}) ---`);
  if (commErr) console.error('Comments error:', commErr);
  else console.log(JSON.stringify(comments, null, 2));

  // 4. Story Engagement Counts
  const { data: counts, error: cntErr } = await supabase.from('story_engagement_counts').select('*');
  console.log(`\n--- STORY ENGAGEMENT COUNTS (Total: ${counts?.length || 0}) ---`);
  if (cntErr) console.error('Counts error:', cntErr);
  else console.log(JSON.stringify(counts, null, 2));

  // 5. Story Views Log Summary
  const { data: views, error: viewErr } = await supabase.from('story_views_log').select('*');
  console.log(`\n--- STORY VIEWS LOG (Total: ${views?.length || 0}) ---`);
  if (viewErr) console.error('Views error:', viewErr);
  else {
    const viewsByStory: Record<string, number> = {};
    const viewsByUser: Record<string, number> = {};
    views?.forEach(v => {
      viewsByStory[v.story_id] = (viewsByStory[v.story_id] || 0) + 1;
      const u = v.user_id || 'null/anonymous';
      viewsByUser[u] = (viewsByUser[u] || 0) + 1;
    });
    console.log('Views grouped by Story ID:', JSON.stringify(viewsByStory, null, 2));
    console.log('Views grouped by User ID:', JSON.stringify(viewsByUser, null, 2));
  }

  // 7. Inspect views for 45d579ee
  console.log('\n--- VIEWS FOR STORY 45d579ee ---');
  const { data: rainViews } = await supabase.from('story_views_log').select('*').eq('story_id', '45d579ee-cde7-4b14-8244-bacdceeb84e9');
  console.log(`Total views logged: ${rainViews?.length}`);
  const userBreakdown: Record<string, number> = {};
  rainViews?.forEach(v => {
    const u = v.user_id || 'null/anonymous';
    userBreakdown[u] = (userBreakdown[u] || 0) + 1;
  });
  console.log('User breakdown for 45d579ee:', userBreakdown);

  // 8. Inspect 30+ View stories
  console.log('\n--- 30+ VIEW STORIES ---');
  const { data: highViews } = await supabase.from('story_engagement_counts').select('*').gte('views_count', 30).order('views_count', { ascending: false });
  console.log(`Found ${highViews?.length} stories with 30+ views`);
  console.log(JSON.stringify(highViews, null, 2));

  console.log('\n=== ENGAGEMENT AUDIT END ===');
}

main().catch(console.error);
