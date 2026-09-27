import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of fs.readFileSync('.env.production.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (v && v !== '[SENSITIVE]') process.env[k] = v;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("=== CHECKING AUTH USERS ===");
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const validUserIds = new Set((usersData?.users || []).map(u => u.id));
  console.log(`Found ${validUserIds.size} genuine auth users in Supabase.`);

  console.log("\n=== CHECKING STORY LIKES ===");
  const { data: allLikes } = await supabase.from("story_likes").select("*");
  console.log(`Total Likes in DB: ${allLikes?.length || 0}`);
  for (const l of allLikes || []) {
    const isReal = validUserIds.has(l.user_id);
    console.log(`- Like: story=${l.story_id}, user=${l.user_id}, created=${l.created_at}, isRealAuth=${isReal}`);
    if (!isReal) {
      console.log(`  -> Deleting invalid/test like for user: ${l.user_id}`);
      await supabase.from("story_likes").delete().eq("id", l.id);
    }
  }

  console.log("\n=== CHECKING STORY COMMENTS ===");
  const { data: allComments } = await supabase.from("story_comments").select("*");
  console.log(`Total Comments in DB: ${allComments?.length || 0}`);
  for (const c of allComments || []) {
    const isReal = validUserIds.has(c.user_id) && c.user_name !== "Guest Reader";
    console.log(`- Comment: id=${c.id}, story=${c.story_id}, user=${c.user_id}, name=${c.user_name}, text="${c.comment_text}", isRealAuth=${isReal}`);
    if (!isReal) {
      console.log(`  -> Deleting invalid/test/guest comment: ${c.id}`);
      await supabase.from("story_comments").delete().eq("id", c.id);
    }
  }

  console.log("\n=== CHECKING STORY VIEWS ===");
  const { count: anonViews } = await supabase.from("story_views_log").select("*", { count: "exact", head: true }).or("user_id.is.null,user_id.ilike.anon_%");
  console.log(`Found ${anonViews || 0} anon/null views.`);
  if (anonViews && anonViews > 0) {
    await supabase.from("story_views_log").delete().or("user_id.is.null,user_id.ilike.anon_%");
    console.log("Deleted anon/null views.");
  }

  console.log("\n=== RECALCULATING ENGAGEMENT COUNTS ===");
  const { data: countRows } = await supabase.from("story_engagement_counts").select("story_id");
  for (const row of countRows || []) {
    const sId = row.story_id;
    const { count: realLikes } = await supabase.from("story_likes").select("*", { count: "exact", head: true }).eq("story_id", sId);
    const { count: realComments } = await supabase.from("story_comments").select("*", { count: "exact", head: true }).eq("story_id", sId);
    const { count: realViews } = await supabase.from("story_views_log").select("*", { count: "exact", head: true }).eq("story_id", sId);

    await supabase
      .from("story_engagement_counts")
      .update({
        likes_count: realLikes || 0,
        comments_count: realComments || 0,
        views_count: realViews || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("story_id", sId);
  }

  console.log("\n=== HEAVY RAIN STORY (45d579ee-cde7-4b14-8244-bacdceeb84e9) ===");
  const heavyRainId = "45d579ee-cde7-4b14-8244-bacdceeb84e9";
  const { data: hrCount } = await supabase.from("story_engagement_counts").select("*").eq("story_id", heavyRainId).single();
  const { data: hrLikes } = await supabase.from("story_likes").select("*").eq("story_id", heavyRainId);
  const { data: hrComments } = await supabase.from("story_comments").select("*").eq("story_id", heavyRainId);
  const { count: hrViews } = await supabase.from("story_views_log").select("*", { count: "exact", head: true }).eq("story_id", heavyRainId);

  console.log("Counts row:", hrCount);
  console.log("Likes rows:", hrLikes);
  console.log("Comments rows:", hrComments);
  console.log("Views count:", hrViews);

  console.log("\n=== OVERALL TOTALS AFTER CLEANUP ===");
  const { count: finalLikes } = await supabase.from("story_likes").select("*", { count: "exact", head: true });
  const { count: finalComments } = await supabase.from("story_comments").select("*", { count: "exact", head: true });
  const { count: finalViews } = await supabase.from("story_views_log").select("*", { count: "exact", head: true });
  console.log(`Likes: ${finalLikes}, Comments: ${finalComments}, Views: ${finalViews}`);
}

main().catch(console.error);
