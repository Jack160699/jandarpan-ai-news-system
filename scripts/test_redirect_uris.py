import urllib.request
from urllib.parse import quote

client_id = "502200355392-nrgkiqga2hgbm3k5qspaso3c38btrje3.apps.googleusercontent.com"

candidates = [
    "https://giiuqshoconjbpiueasp.supabase.co/auth/v1/callback",
    "https://www.jandarpan.news/auth/callback",
    "https://www.jandarpan.news/api/auth/callback",
    "https://jandarpan.news/auth/callback",
    "https://newspaper-motion.vercel.app/auth/callback",
    "http://localhost:3000/auth/callback",
    "http://localhost:3000/api/auth/callback",
    "http://localhost/auth/callback",
    "http://127.0.0.1:3000/auth/callback",
    "https://giiuqshoconjbpiueasp.supabase.co",
    "https://www.jandarpan.news",
]

for uri in candidates:
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&response_type=code&scope=email+profile&redirect_uri={quote(uri, safe='')}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8', errors='ignore')
            if "redirect_uri_mismatch" in body:
                print(f"MISMATCH: {uri}")
            elif "Choose an account" in body or "Sign in" in body:
                print(f"SUCCESS MATCH: {uri}")
            else:
                print(f"OTHER: {uri} (len {len(body)})")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        if "redirect_uri_mismatch" in body:
            print(f"MISMATCH: {uri}")
        else:
            print(f"HTTP ERROR {e.code}: {uri}")
    except Exception as e:
        print(f"ERROR: {uri} -> {e}")
