import urllib.request
from urllib.parse import quote

client_id = "502200355392-nrgkiqga2hgbm3k5qspaso3c38btrje3.apps.googleusercontent.com"

candidates = [
    # Supabase exact variations
    "https://giiuqshoconjbpiueasp.supabase.co/auth/v1/callback",
    "https://giiuqshoconjbpiueasp.supabase.co/auth/v1/callback/",
    "http://giiuqshoconjbpiueasp.supabase.co/auth/v1/callback",
    "https://giiuqshoconjbpiueasp.supabase.co",
    "https://giiuqshoconjbpiueasp.supabase.co/",
    "https://giiuqshoconjbpiueasp.supabase.co/auth/callback",
    "https://giiuqshoconjbpiueasp.supabase.in/auth/v1/callback",
    
    # App direct callbacks
    "https://www.jandarpan.news",
    "https://www.jandarpan.news/",
    "https://www.jandarpan.news/auth/callback",
    "https://www.jandarpan.news/auth/callback/",
    "https://www.jandarpan.news/login",
    "https://www.jandarpan.news/api/auth/callback",
    "https://www.jandarpan.news/api/auth/callback/google",
    "https://jandarpan.news",
    "https://jandarpan.news/",
    "https://jandarpan.news/auth/callback",
    "https://jandarpan.news/auth/callback/",
    "https://jandarpan.news/login",
    "https://jandarpan.news/api/auth/callback",
    "http://www.jandarpan.news",
    "http://www.jandarpan.news/auth/callback",
    "http://jandarpan.news/auth/callback",
    
    # Vercel
    "https://newspaper-motion.vercel.app",
    "https://newspaper-motion.vercel.app/",
    "https://newspaper-motion.vercel.app/auth/callback",
    "https://newspaper-motion.vercel.app/api/auth/callback",
    "https://newspaper-motion-jack160699s-projects.vercel.app",
    "https://newspaper-motion-jack160699s-projects.vercel.app/auth/callback",
    "https://newspaper-motion-git-main-jack160699s-projects.vercel.app/auth/callback",
    
    # Localhost
    "http://localhost",
    "http://localhost/",
    "http://localhost:3000",
    "http://localhost:3000/",
    "http://localhost:3000/auth/callback",
    "http://localhost:3000/api/auth/callback",
    "http://localhost:3000/api/auth/callback/google",
    "http://localhost:8080/auth/callback",
    "http://127.0.0.1:3000/auth/callback",
    "http://127.0.0.1:3000",
    
    # Firebase / GCP defaults
    "https://jan-daarpan.firebaseapp.com/__/auth/handler",
    "https://jan-daarpan.web.app/__/auth/handler",
    "https://jan-darpan.firebaseapp.com/__/auth/handler",
    "https://jan-darpan.web.app/__/auth/handler",
    "https://jandarpan.firebaseapp.com/__/auth/handler",
    "https://jandarpan.web.app/__/auth/handler",
    "https://stratxcel.firebaseapp.com/__/auth/handler",
]

found = []
for uri in candidates:
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&response_type=code&scope=email+profile&redirect_uri={quote(uri, safe='')}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8', errors='ignore')
            if "redirect_uri_mismatch" not in body:
                print(f"!!! MATCH FOUND: {uri}")
                found.append(uri)
            else:
                print(f"No match: {uri}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        if "redirect_uri_mismatch" not in body:
            print(f"!!! MATCH FOUND (HTTP {e.code}): {uri}")
            found.append(uri)
        else:
            print(f"No match: {uri}")
    except Exception as e:
        print(f"Error {uri}: {e}")

print("\n=== SUMMARY OF MATCHES FOR 502200355392-nrgkiqga2hgbm3k5qspaso3c38btrje3.apps.googleusercontent.com ===")
print(found if found else "NO MATCH FOUND AMONG CANDIDATES")
