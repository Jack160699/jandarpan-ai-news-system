const fs = require('fs');
let c = fs.readFileSync('supabase/migrations/20260803120000_073_search_demand_engine.sql', 'utf8');
c = c.replace(/CREATE OR REPLACE FUNCTION public\.update_modified_column\(\)[\s\S]*?language 'plpgsql';/g, '');
const fn = \CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS \\$\\$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
\\$\\$ language 'plpgsql';

\;
fs.writeFileSync('supabase/migrations/20260803120000_073_search_demand_engine.sql', fn + c);
