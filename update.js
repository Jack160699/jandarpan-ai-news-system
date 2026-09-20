const fs = require('fs');
let content = fs.readFileSync('src/lib/ai/prompts.ts', 'utf8');
content = content.replace(
    '    \\'  "sections": {\\',',
    '    \\'  "sections": {\\','
).replace(
    '    \\'    "lead": string (Write the opening paragraph of the article. Jump straight into the news without high-level overview. MUST NOT use the same phrasing as the summary.),\\',',
    '    \\'    "lead": string (Write a detailed 3-4 sentence opening paragraph focusing on the specific event details, people involved, time, and location.),\\','
).replace(
    '    \\'  "summary": string (Write a 2-3 sentence high-level overview AFTER writing the sections. MUST use entirely different phrasing from the body sections),\\',',
    '    \\'  "summary": string (A concise 1-2 sentence executive summary highlighting ONLY the main outcome. Keep it brief and distinct from the lead paragraph.),\\','
);
fs.writeFileSync('src/lib/ai/prompts.ts', content, 'utf8');
