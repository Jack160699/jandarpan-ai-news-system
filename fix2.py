import os

def fix_generate_article():
    filepath = 'src/lib/news/ai/generate-article.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix validation_issues
    content = content.replace('quality.validation_issues.length > 0', '!quality.ok')
    content = content.replace('quality.depth_quality.codes', 'quality.depth_quality?.codes ?? []')
    content = content.replace('quality.validation_issues.map(i => i.code)', 'quality.codes')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_generate_article()
