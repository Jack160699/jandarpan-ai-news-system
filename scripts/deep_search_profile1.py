import os
import re

profile_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1"

target_props = ["554621476", "538010450", "395102226"]
found_g = set()

for root, dirs, files in os.walk(profile_dir):
    for f in files:
        if f.endswith((".log", ".ldb", ".default", ".sqlite", ".dat", "LOCK", ".lock")):
            continue
        p = os.path.join(root, f)
        try:
            if os.path.getsize(p) > 20 * 1024 * 1024:
                continue
            with open(p, "rb") as fp:
                data = fp.read()
                
            # Find G- tags
            matches = re.findall(rb"G-[A-Z0-9]{8,12}", data)
            for m in matches:
                found_g.add((m.decode('latin1'), f))
                
            # Check for property IDs
            for tp in target_props:
                idx = data.find(tp.encode('latin1'))
                if idx != -1:
                    snippet = data[max(0, idx-80):min(len(data), idx+150)]
                    # Clean binary
                    clean = re.sub(rb'[^\x20-\x7E]', b' ', snippet).decode('latin1')
                    print(f"File: {os.path.relpath(p, profile_dir)} | Match {tp}:\n{clean}\n")
        except Exception:
            pass

print("=== All G- Measurement IDs found ===")
for g, f in sorted(found_g):
    print(f"{g} (in {f})")
