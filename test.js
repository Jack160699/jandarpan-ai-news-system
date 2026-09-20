require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('worker_jobs').select('*').eq('job_type', 'editorial_generate').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
