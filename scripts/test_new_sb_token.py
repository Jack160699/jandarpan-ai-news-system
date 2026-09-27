import urllib.request
import json

token = "AKCbtip-nUbjqDKt2lXvLZUAC9R8ZxbpF1cBfaYNVHLJauEcPwA"

# First refresh the token using https://api.supabase.com or https://alt.supabase.io/auth/v1/token?grant_type=refresh_token
url = "https://alt.supabase.io/auth/v1/token?grant_type=refresh_token"
data = json.dumps({"refresh_token": token}).encode('utf-8')
headers = {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEwYjMwYWUwLTg0ZTktNDMwYy04NjhjLTMxMmIwZGFhOTNlZiIsInR5cCI6IkpXVCJ9"
}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Got new access token!")
        access_token = res["access_token"]
        
        # Test calling Supabase management API
        req_auth = urllib.request.Request(
            "https://api.supabase.com/v1/projects/giiuqshoconjbpiueasp/config/auth",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        with urllib.request.urlopen(req_auth) as r2:
            auth_config = json.loads(r2.read().decode())
            print("Successfully read Supabase Auth Config!")
            print("Keys in auth config:", list(auth_config.keys()))
            for k in auth_config:
                if "google" in k.lower():
                    # Mask secret
                    val = auth_config[k]
                    if "secret" in k.lower() and isinstance(val, str):
                        val = val[:4] + "..." + val[-4:] if len(val) > 8 else "***"
                    print(f"  {k}: {val}")
except urllib.error.HTTPError as e:
    print("HTTP error:", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
