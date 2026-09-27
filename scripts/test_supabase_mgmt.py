import urllib.request
import json

refresh_token = "ACwueKACkUMOoqJA0LnUvPgAq4tO-wBmOndbZGgisbmXD986uuc"

# Let's try refreshing via alt.supabase.io/auth/v1/token?grant_type=refresh_token
url = "https://alt.supabase.io/auth/v1/token?grant_type=refresh_token"
data = json.dumps({"refresh_token": refresh_token}).encode('utf-8')
headers = {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEwYjMwYWUwLTg0ZTktNDMwYy04NjhjLTMxMmIwZGFhOTNlZiIsInR5cCI6IkpXVCJ9" # from url iss
}

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as resp:
        print("Refresh success:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP error:", e.code, e.read().decode())
except Exception as e:
    print("Error:", e)
