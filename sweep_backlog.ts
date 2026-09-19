import { createAdminServerClient } from './src/lib/supabase';
import { publishGeneratedArticle } from './src/lib/editorial/publication';
import { evaluateDraft } from './src/lib/news/ai/editorial-guards';

async function run() {
  const supabase = createAdminServerClient();
  const { data: rows } = await supabase
    .from('generated_articles')
    .select('*')
    .in('workflow_status', ['draft', 'pending', 'held_for_quality'])
    .is('published_at', null);
    
  console.log('Found', rows?.length, 'backlog articles');
}
run();
