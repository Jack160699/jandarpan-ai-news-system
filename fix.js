const fs = require('fs');

let repair = fs.readFileSync('src/lib/news/ai/editorial-repair.ts', 'utf-8');
repair = repair.replace('};\n}\n    const userContent', '};\n    const userContent');
repair = repair.replace('};\r\n}\r\n    const userContent', '};\r\n    const userContent');
repair = repair.replace(/}\r?\n}\r?\n$/g, '}\r\n');
// Also check for 'catch {' without 'try {'
// Wait, the 'try {' is there! It's just that it got closed early.
fs.writeFileSync('src/lib/news/ai/editorial-repair.ts', repair);
