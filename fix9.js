const fs = require('fs');
let content = fs.readFileSync('src/lib/ai/prompts.ts', 'utf8');

content = content.replace(
  /'    "details": string \(main report in natural newsroom prose; multiple paragraphs OK with \n\n\),'/g,
  "'    \"details\": string (main report in natural newsroom prose; multiple paragraphs OK with \\\\n\\\\n),'"
);

fs.writeFileSync('src/lib/ai/prompts.ts', content, 'utf8');
