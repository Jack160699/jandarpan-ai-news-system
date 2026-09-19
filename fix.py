import os

def replace_in_file(filepath, old, new):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

replace_in_file('src/lib/ai/prompts.depth-correction.test.ts', 'depthCorrection:', 'repairContext:')
replace_in_file('src/lib/news/ai/generate-article.ts', 'depthCorrection,', 'repairContext,')
replace_in_file('src/lib/news/ai/generate-article.ts', 'depthCorrection:', 'repairContext:')
replace_in_file('src/lib/news/ai/generate-article.ts', 'depthCorrection=', 'repairContext=')

# Also for validation_issues -> failureCodes or something
# Let's inspect what's at line 1476 of generate-article.ts
