import sys

with open('src/lib/ai/prompts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    "Output MUST be valid JSON only:",
    "{",
    '  "headline": string,',
    '  "summary": string (Write a 2-3 sentence high-level overview. Do NOT use the exact same sentences as the body sections.),',
    '  "article_type": string (echo the assigned article type),',
    '  "sections": {',
    '    "lead": string (Write the opening paragraph of the article. It MUST use entirely different phrasing from the summary. Do NOT copy the summary.),',
    '    "details": string (main report in natural newsroom prose; multiple paragraphs OK with \\n\\n),',
    '    "context": string (OPTIONAL — background, impact, what next when verifiable; omit key if no facts)',
    "  },",'''

replacement = '''    "Output MUST be valid JSON only:",
    "{",
    '  "headline": string,',
    '  "article_type": string (echo the assigned article type),',
    '  "sections": {',
    '    "lead": string (Write the opening paragraph of the article. Jump straight into the news without high-level overview. MUST NOT use the same phrasing as the summary.),',
    '    "details": string (main report in natural newsroom prose; multiple paragraphs OK with \\n\\n),',
    '    "context": string (OPTIONAL — background, impact, what next when verifiable; omit key if no facts)',
    "  },",
    '  "summary": string (Write a 2-3 sentence high-level overview AFTER writing the sections. MUST use entirely different phrasing from the body sections),','''

if target in content:
    content = content.replace(target, replacement)
    with open('src/lib/ai/prompts.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
