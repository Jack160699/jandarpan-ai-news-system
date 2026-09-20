import sys

with open('src/lib/ai/prompts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    '    "details": string (main report in natural newsroom prose; multiple paragraphs OK with \n\n),'''

replacement = '''    '    "details": string (main report in natural newsroom prose; multiple paragraphs OK with \\n\\n),'''

content = content.replace(target, replacement)
with open('src/lib/ai/prompts.ts', 'w', encoding='utf-8') as f:
    f.write(content)
