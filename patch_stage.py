import sys
content = open('src/lib/autonomous/rollout-state.ts').read()
content = content.replace(
    'const raw = (env.AUTONOMOUS_ROLLOUT_STAGE ?? "shadow").trim().toLowerCase();',
    'const raw = (env.AUTONOMOUS_ROLLOUT_STAGE ?? "stage_3").trim().toLowerCase();'
)
content = content.replace(
    'return "shadow";',
    'return "stage_3";'
)
open('src/lib/autonomous/rollout-state.ts', 'w').write(content)
