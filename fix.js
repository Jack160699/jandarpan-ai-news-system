const fs = require('fs');
let content = fs.readFileSync('src/lib/ai/prompts.ts', 'utf8');

content = content.replace(
  /\"summary\": string \(2-3 sentence dek — shown separately; do NOT repeat in body\),/g,
  '\"summary\": string (Write a 2-3 sentence high-level overview. Do NOT use the exact same sentences as the body sections.),'
);

content = content.replace(
  /\"lead\": string \(opening paragraph — must NEVER start with the same words as the summary\. Write a completely new opening sentence\.\),/g,
  '\"lead\": string (Write the opening paragraph of the article. It MUST use entirely different phrasing from the summary. Do NOT copy the summary.),'
);

content = content.replace(
  /- Do not repeat paragraphs or sentences\. Each paragraph must provide new information\./g,
  '- NEVER output the same paragraph twice. Every paragraph MUST contain unique and distinct information.'
);

content = content.replace(
  /- Never use visible template section headings inside section text \(no ## ​, ​_​ ​_​, ​ ​, ## Background, etc\.\)\./g,
  '- NEVER use any markdown headings (e.g. ##, ###) or bold titles (e.g. **Details:**) inside the section text. Write natural flowing paragraphs only.'
);

fs.writeFileSync('src/lib/ai/prompts.ts', content, 'utf8');
