import sys
content = open('src/lib/observability/openai-cost/repair-policy.ts').read()
old_str = '''  if (quality.rejectionReasons.includes("low_seo_quality")) {
    reasons.push("seo_missing");
  }'''
new_str = '''  if (quality.rejectionReasons.includes("low_seo_quality")) {
    reasons.push("seo_missing");
  }
  if (quality.rejectionReasons.includes("held_for_quality")) {
    reasons.push("held_for_quality");
  }'''
content = content.replace(old_str, new_str)
open('src/lib/observability/openai-cost/repair-policy.ts', 'w').write(content)
