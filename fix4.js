const fs = require('fs');
let content = fs.readFileSync('src/lib/news/ai/editorial-depth-quality.ts', 'utf8');

content = content.replace(
  /const key = normalizePara\(p\)\.slice\(0, 160\);/g,
  'const key = normalizePara(p).slice(0, 300);'
);

fs.writeFileSync('src/lib/news/ai/editorial-depth-quality.ts', content, 'utf8');
