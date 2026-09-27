import os
import re

cache_dir = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Service Worker\CacheStorage"

for root, dirs, files in os.walk(cache_dir):
    for f in files:
        p = os.path.join(root, f)
        try:
            with open(p, "rb") as fp:
                data = fp.read()
            if b"analytics" in data.lower():
                matches = re.findall(rb"https?://[^\x00-\x20\"'<>]+", data)
                clean_urls = [m.decode('latin1') for m in matches if 'analytics' in m.decode('latin1').lower()]
                if clean_urls:
                    print(f"Origin in {os.path.basename(root)} / {f}:")
                    for u in set(clean_urls[:5]):
                        print("  ", u)
            
            # Check for G-
            g_matches = re.findall(rb"G-[A-Z0-9]{8,12}", data)
            if g_matches:
                print(f"G- tags in {f}:", set(m.decode('latin1') for m in g_matches))
                
            # Check for 538010450
            if b"538010450" in data:
                print(f"Found 538010450 in {f}!")
                idx = data.find(b"538010450")
                print(data[max(0, idx-50):min(len(data), idx+150)].decode('latin1', 'ignore'))
        except Exception:
            pass
