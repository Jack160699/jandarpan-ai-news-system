const fs = require('fs');
let content = fs.readFileSync('src/lib/ai/prompts.ts', 'utf8');

content = content.replace(
  /- Never use visible template section headings inside section text \(no ## .*?, ## Background, etc\.\)\./g,
  '- NEVER use any markdown headings (e.g. ##, ###) or bold titles (e.g. **Details:**) inside the section text. Write natural flowing paragraphs only.'
);

fs.writeFileSync('src/lib/ai/prompts.ts', content, 'utf8');
