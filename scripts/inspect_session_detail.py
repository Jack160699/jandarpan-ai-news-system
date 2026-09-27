import os

dir_path = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Sessions"
for fname in os.listdir(dir_path):
    fpath = os.path.join(dir_path, fname)
    with open(fpath, "rb") as f:
        data = f.read()
    
    # search for keywords
    for kw in [b"nrgkiqga", b"giiuqshoconjbpiueasp", b"502200355392"]:
        pos = 0
        while True:
            idx = data.find(kw, pos)
            if idx == -1:
                break
            start = max(0, idx - 150)
            end = min(len(data), idx + 250)
            chunk = data[start:end]
            # print printable chars
            clean = "".join(chr(b) if 32 <= b < 127 else " " for b in chunk)
            print(f"[{fname}] Match for {kw} at {idx}:")
            print(clean)
            print("-" * 60)
            pos = idx + len(kw)
