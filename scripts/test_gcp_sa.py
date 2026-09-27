import json
import re

with open(".env.production.local", "r", encoding="utf-8") as f:
    text = f.read()

# Match between GSC_SERVICE_ACCOUNT_JSON= and GSC_SITE_URL
idx1 = text.find("GSC_SERVICE_ACCOUNT_JSON=")
idx2 = text.find("GSC_SITE_URL=", idx1)
val = text[idx1 + len("GSC_SERVICE_ACCOUNT_JSON=") : idx2].strip()

if val.startswith('"') and val.endswith('"'):
    val = val[1:-1]

val = val.replace("\\n", "\n")

try:
    sa = json.loads(val, strict=False)
    print("Parsed successfully!")
    print("Project ID:", sa.get("project_id"))
    print("Client Email:", sa.get("client_email"))
    with open("sa_parsed.json", "w") as out:
        json.dump(sa, out, indent=2)
except Exception as e:
    print("Error parsing JSON:", e)
    # try unescaping
    print("Sample:", val[:100])
