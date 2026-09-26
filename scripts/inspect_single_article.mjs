import { execSync } from "node:child_process";

async function inspect() {
  const raw = execSync('npx supabase db query --linked "SELECT id, headline, published_at, hero_image_url FROM generated_articles WHERE headline ILIKE \'%Security Forces%\';" -o json', { encoding: 'utf-8' });
  console.log(raw);
}

inspect().catch(console.error);
