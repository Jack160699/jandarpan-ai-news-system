import urllib.request
import json

token = "AKCbtip-nUbjqDKt2lXvLZUAC9R8ZxbpF1cBfaYNVHLJauEcPwA"
url = "https://alt.supabase.io/auth/v1/token?grant_type=refresh_token"
data = json.dumps({"refresh_token": token}).encode('utf-8')
headers = {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEwYjMwYWUwLTg0ZTktNDMwYy04NjhjLTMxMmIwZGFhOTNlZiIsInR5cCI6IkpXVCJ9"
}

req = urllib.request.Request(url, data=data, headers=headers)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    access_token = res["access_token"]
    
patch_data = json.dumps({"site_url": "https://www.jandarpan.news"}).encode('utf-8')
req_patch = urllib.request.Request(
    "https://api.supabase.com/v1/projects/giiuqshoconjbpiueasp/config/auth",
    data=patch_data,
    headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    },
    method="PATCH"
)

try:
    with urllib.request.urlopen(req_patch) as r2:
        resp_json = json.loads(r2.read().decode())
        print("PATCH succeeded! New site_url:", resp_json.get("site_url"))
except urllib.error.HTTPError as e:
    print("HTTP error:", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
