import glob
import subprocess

src_files = glob.glob(r'C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Sessions\Session_*')
if not src_files:
    print("No session files found")
    exit(0)

src = src_files[-1]
dst = r'C:\Users\shriyansh chandrakar\AppData\Local\Temp\curr_session.bin'

# Copy using PowerShell
cmd = ["powershell", "-NoProfile", "-Command", f'Copy-Item -LiteralPath "{src}" -Destination "{dst}" -Force']
res = subprocess.run(cmd, capture_output=True, text=True)
print("Copy output:", res.stdout, res.stderr)

try:
    with open(dst, 'rb') as f:
        data = f.read()
    print("Session file size:", len(data))
    
    import re
    urls = re.findall(rb'https?://[a-zA-Z0-9.-]+(?:/[^\s\x00-\x1f\x7f-\xff]*)?', data)
    unique_urls = sorted(list(set(urls)))
    for u in unique_urls:
        s = u.decode('latin1', errors='ignore')
        if any(k in s for k in ['cloud.google', 'supabase', 'jandarpan', 'client', 'oauth']):
            print(s[:140])
except Exception as e:
    print("Error reading copied session:", e)
