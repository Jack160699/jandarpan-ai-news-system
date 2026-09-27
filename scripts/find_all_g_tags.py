import os
import re
import sqlite3

user_data = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data"
g_tags = set()

for root, dirs, files in os.walk(user_data):
    if "Cache" in root:
        continue
    for f in files:
        if f in ["History", "Web Data", "Preferences", "Network Persistent State"]:
            p = os.path.join(root, f)
            try:
                with open(p, "rb") as fp:
                    data = fp.read()
                matches = re.findall(rb"G-[A-Z0-9]{8,12}", data)
                for m in matches:
                    g_tags.add((m.decode('latin1'), os.path.relpath(p, user_data)))
            except:
                pass

print("=== ALL G- TAGS IN CHROME USER DATA ===")
for tag, src in sorted(g_tags):
    print(f"{tag} -> {src}")
