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
    
req_auth = urllib.request.Request(
    "https://api.supabase.com/v1/projects/giiuqshoconjbpiueasp/config/auth",
    headers={"Authorization": f"Bearer {access_token}"}
)
with urllib.request.urlopen(req_auth) as r2:
    cfg = json.loads(r2.read().decode())
    print("site_url:", cfg.get("site_url"))
    print("uri_allow_list:", cfg.get("uri_allow_list"))
    print("external_google_client_id:", cfg.get("external_google_client_id"))
    print("external_google_enabled:", cfg.get("external_google_enabled"))
    print("external_google_additional_client_ids:", cfg.get("external_google_additional_client_ids"))
    print("external_google_skip_nonce_check:", cfg.get("external_google_skip_nonce_check"))
