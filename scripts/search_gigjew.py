import os
import re

profile_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1"

for root, dirs, files in os.walk(profile_dir):
    for f in files:
        if f.endswith((".log", ".ldb", ".default", ".sqlite", ".dat", "LOCK", ".lock")):
            continue
        p = os.path.join(root, f)
        try:
            if os.path.getsize(p) > 30 * 1024 * 1024:
                continue
            with open(p, "rb") as fp:
                data = fp.read()
            if b"G-GIGJEW2EH4" in data:
                print(f"Match G-GIGJEW2EH4 in {os.path.relpath(p, profile_dir)}:")
                idx = data.find(b"G-GIGJEW2EH4")
                snippet = re.sub(rb'[^\x20-\x7E]', b' ', data[max(0, idx-100):min(len(data), idx+200)]).decode('latin1')
                print(snippet)
                print("-" * 50)
        except Exception:
            pass
