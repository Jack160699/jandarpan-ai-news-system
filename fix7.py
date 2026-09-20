import sys
import re

with open('src/lib/ai/prompts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r'(\s*"Output MUST be valid JSON only:",\s*"{",\s*\'  "headline": string,\',)(\s*\'  "summary": string \(Write a 2-3 sentence high-level overview\. Do NOT use the exact same sentences as the body sections\.\),\',)(\s*\'  "article_type": string \(echo the assigned article type\),\',)(\s*\'  "sections": {,\')?(\s*\'  "sections": {,\')?(\s*\'  "sections": {,\')?(\s*\'  "sections": {,\')?(\s*\'  "sections": {,\')?', re.DOTALL)

# Just doing a manual replace by finding the index of things
idx_start = content.find('"Output MUST be valid JSON only:"')
idx_end = content.find('"seo_title": string', idx_start)

if idx_start != -1 and idx_end != -1:
    before = content[:idx_start]
    after = content[idx_end:]
    
    middle = '''"Output MUST be valid JSON only:",
    "{",
    '  "headline": string,',
    '  "article_type": string (echo the assigned article type),',
    '  "sections": {',
    '    "lead": string (Write the opening paragraph of the article. Jump straight into the news without high-level overview. MUST NOT use the same phrasing as the summary.),',
    '    "details": string (main report in natural newsroom prose; multiple paragraphs OK with \\n\\n),',
    '    "context": string (OPTIONAL — background, impact, what next when verifiable; omit key if no facts)',
    "  },",
    '  "summary": string (Write a 2-3 sentence high-level overview AFTER writing the sections. MUST use entirely different phrasing from the body sections),',
    '  '''
    
    new_content = before + middle + after
    with open('src/lib/ai/prompts.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print("Could not find bounds")
