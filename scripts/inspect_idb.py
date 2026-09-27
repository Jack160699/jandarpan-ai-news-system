import os
import re

idb_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\IndexedDB"

for root, dirs, files in os.walk(idb_dir):
    if "analytics" in root.lower():
        for f in files:
            p = os.path.join(root, f)
            try:
                with open(p, "rb") as fp:
                    data = fp.read()
                
                # Look for G- tags
                g_tags = re.findall(rb"G-[A-Z0-9]{8,12}", data)
                if g_tags:
                    print(f"File {f} in {os.path.basename(root)} G-tags:", [g.decode('latin1') for g in set(g_tags)])
                
                # Look for stream IDs or property names
                matches = re.finditer(rb"(?:538010450|554621476|395102226|jandarpan|durgsolar|stratxcel|MeasurementID)", data, re.IGNORECASE)
                for m in matches:
                    start = max(0, m.start() - 100)
                    end = min(len(data), m.end() + 200)
                    snippet = re.sub(rb'[^\x20-\x7E]', b' ', data[start:end]).decode('latin1')
                    print(f"Match {m.group(0).decode('latin1')} in {f}:\n{snippet}\n---")
            except Exception as e:
                pass
