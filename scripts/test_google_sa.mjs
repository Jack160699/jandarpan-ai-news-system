import crypto from "crypto";
import fs from "fs";

// Load service account from .env.production.local
const envContent = fs.readFileSync(".env.production.local", "utf8");
const match = envContent.match(/GSC_SERVICE_ACCOUNT_JSON="([\s\S]*?)"\n[A-Z_]+=/);
if (!match) {
  console.error("GSC_SERVICE_ACCOUNT_JSON not found");
  process.exit(1);
}

let saJsonStr = match[1].replace(/\\n/g, "\n");
let sa;
try {
  sa = JSON.parse(saJsonStr);
} catch {
  // If unquoted JSON
  sa = JSON.parse(saJsonStr.replace(/([a-zA-Z0-9_]+):/g, '"$1":'));
}

console.log("Service Account Info:");
console.log("  Project ID:", sa.project_id);
console.log("  Client Email:", sa.client_email);

function createJwt(sa, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsignedToken = `${b64(header)}.${b64(claimSet)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(sa.private_key, "base64url");

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(sa, scopes) {
  const jwt = createJwt(sa, scopes);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  return await resp.json();
}

async function checkApis() {
  const scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
  ];
  const tokenData = await getAccessToken(sa, scopes);
  console.log("Token Response:", tokenData.error ? tokenData : "Token successfully generated (access_token received)");
  if (!tokenData.access_token) return;

  const token = tokenData.access_token;

  // 1. Check GA4 Account Summaries / Properties
  console.log("\n--- Checking Google Analytics Admin API ---");
  const gaRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const gaData = await gaRes.json();
  console.log("GA4 Account Summaries:", JSON.stringify(gaData, null, 2));

  // 2. Check GCP Project Info
  console.log("\n--- Checking GCP Project Info ---");
  const projRes = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${sa.project_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projData = await projRes.json();
  console.log("GCP Project Data:", JSON.stringify(projData, null, 2));
}

checkApis().catch(console.error);
