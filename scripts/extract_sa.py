import json
import re

with open('.env.production.real', 'r', encoding='utf-8') as f:
    s = f.read()

m = re.search(r'GSC_SERVICE_ACCOUNT_JSON="(.*?)"\nGSC_SITE_URL', s, re.DOTALL)
if not m:
    print("Not found")
    exit(1)

content = m.group(1).replace('\\"', '"')
sa = json.loads(content, strict=False)
print("Service Account:", sa['client_email'])
print("Project:", sa['project_id'])

with open('sa_temp.json', 'w') as out:
    json.dump(sa, out, indent=2)
print("Saved sa_temp.json")
