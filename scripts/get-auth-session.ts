import fs from 'node:fs';
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
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'shriyanshchandrakar@gmail.com'
  });
  if (error) {
    console.error('Error generating link:', error);
    return;
  }
  console.log('Action link properties:', data.properties);
}

main().catch(console.error);
