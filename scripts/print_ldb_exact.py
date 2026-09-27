import os
import re

p = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Local Storage\leveldb\000005.ldb"
with open(p, "rb") as f:
    data = f.read()

idx = 0
while True:
    idx = data.find(b"395102226", idx)
    if idx == -1:
        break
    start = max(0, idx - 200)
    end = min(len(data), idx + 500)
    snippet = data[start:end]
    clean = re.sub(rb'[^\x20-\x7E]', b' ', snippet).decode('latin1')
    print("Match:\n", clean)
    print("=" * 60)
    idx += 9
