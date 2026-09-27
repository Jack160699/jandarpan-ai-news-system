import glob
import re
import os

pattern = re.compile(rb'502200355392-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com')

found = set()

base_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data"
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith(('.ldb', '.log', '.dat', '.sqlite', '.db', '.txt', 'data_0', 'data_1', 'data_2', 'data_3')):
            fpath = os.path.join(root, f)
            try:
                with open(fpath, 'rb') as fp:
                    content = fp.read()
                    matches = pattern.findall(content)
                    for m in matches:
                        s = m.decode('latin1', errors='ignore')
                        if s not in found:
                            found.add(s)
                            print(f"FOUND CLIENT ID: {s} in {fpath}")
            except Exception:
                pass

print("\n=== ALL DETECTED GOOGLE CLIENT IDs FOR PROJECT 502200355392 ===")
for cid in sorted(list(found)):
    print(cid)
