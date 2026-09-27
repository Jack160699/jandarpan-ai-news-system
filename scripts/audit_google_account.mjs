import fs from "fs";
import crypto from "crypto";

const content = fs.readFileSync(".env.production.local", "utf8");
const start = content.indexOf("GSC_SERVICE_ACCOUNT_JSON=");
const nextVar = content.indexOf("GSC_SITE_URL=");
let chunk = content.slice(start + "GSC_SERVICE_ACCOUNT_JSON=".length, nextVar).trim();
if (chunk.startsWith('"') && chunk.endsWith('"')) {
  chunk = chunk.slice(1, -1);
}
chunk = chunk.replace(/\\n/g, "\n");

const pkStart = chunk.indexOf("-----BEGIN PRIVATE KEY-----");
const pkEnd = chunk.indexOf("-----END PRIVATE KEY-----") + "-----END PRIVATE KEY-----".length;
const private_key = chunk.slice(pkStart, pkEnd);

const sa = {
  type: "service_account",
  project_id: "jan-daarpan",
  private_key_id: "7772b2ca0b60256130eb71ba009b305e3aedae66",
  private_key: private_key,
  client_email: "jandarpan-gsc@jan-daarpan.iam.gserviceaccount.com",
  client_id: "117911760213566756553",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

async function run() {
  console.log("Service Account parsed:");
  console.log("  Project ID:", sa.project_id);
  console.log("  Client Email:", sa.client_email);

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  console.log("Google Token Status:", res.status);
  if (!data.access_token) {
    console.error("Failed to get token:", data);
    return;
  }
  console.log("Access token obtained successfully!");

  const token = data.access_token;

  // 1. Check GA4 Account Summaries
  console.log("\n=== 1. GA4 Account Summaries ===");
  const gaRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("GA4 Account Summaries Status:", gaRes.status);
  const gaData = await gaRes.json();
  console.log("GA4 Account Summaries:", JSON.stringify(gaData, null, 2));

  // 1b. Check GA4 Properties
  console.log("\n=== 1b. GA4 Properties ===");
  const gaPropsRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/properties", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("GA4 Properties Status:", gaPropsRes.status);
  const gaPropsData = await gaPropsRes.json();
  console.log("GA4 Properties:", JSON.stringify(gaPropsData, null, 2));

  // 2. Check GCP Project
  console.log("\n=== 2. GCP Project Info ===");
  const projRes = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${sa.project_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("GCP Project Status:", projRes.status);
  const projData = await projRes.json();
  console.log("GCP Project Info:", JSON.stringify(projData, null, 2));

  // 3. Check IAM / Service accounts in project
  console.log("\n=== 3. GCP IAM & Service Accounts ===");
  const iamRes = await fetch(`https://iam.googleapis.com/v1/projects/${sa.project_id}/serviceAccounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("IAM Status:", iamRes.status);
  const iamData = await iamRes.json();
  console.log("IAM Service Accounts:", JSON.stringify(iamData, null, 2));

  // 4. Check OAuth Brands / Clients if available
  console.log("\n=== 4. GCP OAuth Brands / Clients ===");
  const oauthRes = await fetch(`https://iap.googleapis.com/v1/projects/${sa.project_id}/brands`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("OAuth Brands Status:", oauthRes.status);
  const oauthData = await oauthRes.json();
  console.log("OAuth Brands:", JSON.stringify(oauthData, null, 2));
}

run().catch(console.error);
