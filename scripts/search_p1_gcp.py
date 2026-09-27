import os
import re

profile_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1"
terms = [b"502200355392", b"nrgkiqga", b"giiuqshoconjbpiueasp"]

matches = []

for root, dirs, files in os.walk(profile_dir):
    for f in files:
        if f.endswith((".lock", "LOCK")):
            continue
        p = os.path.join(root, f)
        try:
            sz = os.path.getsize(p)
            if sz > 50 * 1024 * 1024 or sz == 0:
                continue
            with open(p, "rb") as fp:
                data = fp.read()
            for t in terms:
                if t in data:
                    rel = os.path.relpath(p, profile_dir)
                    idx = 0
                    while True:
                        idx = data.find(t, idx)
                        if idx == -1:
                            break
                        snippet = data[max(0, idx-100):min(len(data), idx+200)]
                        clean = re.sub(rb'[^\x20-\x7E]', b' ', snippet).decode('latin1', errors='ignore')
                        matches.append((rel, t.decode(), clean))
                        idx += len(t)
                        if len(matches) > 50:
                            break
        except Exception:
            pass

print(f"Total occurrences: {len(matches)}")
for rel, t, snippet in matches[:30]:
    print(f"--- File: {rel} (term: {t}) ---")
    print(snippet)
    print()
