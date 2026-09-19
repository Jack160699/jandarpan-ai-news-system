const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.production manually
const envFile = fs.readFileSync('.env.production', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('generated_articles')
    .select('id, workflow_status, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) console.error(error);
  else console.log(data);
}
check();
