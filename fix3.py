import os

def fix_generate_article():
    filepath = 'src/lib/news/ai/generate-article.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace('!quality.ok', '!quality.passed')
    content = content.replace('quality.codes', 'quality.rejectionReasons')
    
    # Also fix depth_quality?.codes to depth_quality?.issues.map(i => i.code) if it exists
    # Wait, earlier log showed quality.depth_quality.codes without ?. Let me check if 'codes' is valid for depth_quality.
    # Actually, in editorial-guards.ts it was depth_quality.issues. But in generate-article.ts, earlier code had quality.depth_quality.codes! So maybe depth_quality DOES have codes? Let's check alidateEditorialDepth return type.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_generate_article()
