import sys
content = open('src/lib/newsroom/edition-scheduler.ts').read()
content = content.replace(
    '"12:00": 12,',
    '"12:00": 12,\n    "14:00": 14,'
)
content = content.replace(
    '| "12:00"',
    '| "12:00"\n    | "14:00"'
)
content = content.replace(
    'if (slot === "12:00") return EDITORIAL_CAPACITY.editions.noon;',
    'if (slot === "12:00" || slot === "14:00") return EDITORIAL_CAPACITY.editions.noon;'
)
open('src/lib/newsroom/edition-scheduler.ts', 'w').write(content)
