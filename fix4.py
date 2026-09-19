import os
import re

def fix_generate_article():
    filepath = 'src/lib/news/ai/generate-article.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(r'\bdepthCorrection\b', 'repairContext', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_generate_article()
