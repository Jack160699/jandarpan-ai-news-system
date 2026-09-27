import os
import re

ldb_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Local Storage\leveldb"

for f in os.listdir(ldb_dir):
    p = os.path.join(ldb_dir, f)
    try:
        with open(p, "rb") as fp:
            data = fp.read()
        
        # Search for G- tags
        g_tags = re.findall(rb"G-[A-Z0-9]{8,12}", data)
        if g_tags:
            print(f"File {f} G-tags:", [g.decode('latin1') for g in set(g_tags)])
            
        # Search for analytics.google.com
        if b"analytics" in data:
            for m in re.finditer(rb"(?:G-[A-Z0-9]{8,12}|streams?/\d+|\d{9,10}|jandarpan|durgsolar|stratxcel)", data, re.IGNORECASE):
                start = max(0, m.start() - 60)
                end = min(len(data), m.end() + 100)
                snippet = re.sub(rb'[^\x20-\x7E]', b' ', data[start:end]).decode('latin1')
                print(f"Match in {f} ({m.group(0).decode('latin1', 'ignore')}):\n{snippet}\n")
    except Exception as e:
        pass
