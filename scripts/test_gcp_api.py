import json
import time
from urllib.parse import urlencode
import urllib.request
import hmac
import hashlib
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

with open("sa_parsed.json", "r") as f:
    sa = json.load(f)

def get_token(scopes):
    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    payload = {
        "iss": sa["client_email"],
        "scope": " ".join(scopes),
        "aud": "https://oauth2.googleapis.com/token",
        "exp": now + 3600,
        "iat": now,
    }
    
    def b64(d):
        return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")

    unsigned = f"{b64(header)}.{b64(payload)}"
    priv_key = load_pem_private_key(sa["private_key"].encode(), password=None)
    sig = priv_key.sign(unsigned.encode(), padding.PKCS1v15(), hashes.SHA256())
    jwt = f"{unsigned}.{base64.urlsafe_b64encode(sig).decode().rstrip('=')}"

    data = urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": jwt
    }).encode()

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        return res["access_token"]

try:
    token = get_token(["https://www.googleapis.com/auth/cloud-platform"])
    print("Token obtained successfully!")
    
    # Try calling Google Cloud Resource Manager
    req = urllib.request.Request(
        f"https://cloudresourcemanager.googleapis.com/v1/projects/{sa['project_id']}",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Project details:", resp.read().decode())
except Exception as e:
    print("Error:", e)
