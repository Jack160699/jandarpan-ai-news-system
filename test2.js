const fs = require('fs');
let content = fs.readFileSync('src/lib/ai/prompts.ts', 'utf8');
const idx = content.indexOf('paragraphs OK with ');
if (idx !== -1) {
    console.log(content.substring(idx + 19, idx + 30).split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
    console.log(content.substring(idx + 19, idx + 30));
}
