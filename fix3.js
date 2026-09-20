const fs = require('fs');
let content = fs.readFileSync('src/lib/news/ai/editorial-body.ts', 'utf8');

content = content.replace(
  /if \(a\.startsWith\(b\.slice\(0, Math\.min\(80, b\.length\)\)\)\) return true;/g,
  'if (a.length >= 150 && b.length >= 150 && a.startsWith(b.slice(0, 150))) return true;'
);

content = content.replace(
  /if \(b\.startsWith\(a\.slice\(0, Math\.min\(80, a\.length\)\)\)\) return true;/g,
  'if (a.length >= 150 && b.length >= 150 && b.startsWith(a.slice(0, 150))) return true;'
);

content = content.replace(
  /if \(a\.length >= 40 && b\.length >= 40\) {/g,
  'if (a.length >= 80 && b.length >= 80) {'
);

fs.writeFileSync('src/lib/news/ai/editorial-body.ts', content, 'utf8');
