import crypto from "crypto";
import fs from "fs";

const sa = JSON.parse(fs.readFileSync("sa_temp.json", "utf-8"));

function base64Url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const toSign = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(toSign);
  const signature = sign.sign(sa.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${toSign}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (data.error) {
    console.error("OAuth token error:", data);
    return null;
  }
  return data.access_token;
}

async function main() {
  const token = await getAccessToken([
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
  ]);

  console.log("Got access token:", token ? token.slice(0, 15) + "..." : "NONE");
  if (!token) return;

  // 1. List accounts
  console.log("\nListing GA accounts...");
  const accRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accounts", {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Accounts status:", accRes.status);
  const accData = await accRes.json();
  console.log("Accounts response:", JSON.stringify(accData, null, 2));

  // 2. Query Data Streams for properties 538010450 and 554621476
  for (const propId of ["538010450", "554621476"]) {
    console.log(`\nQuerying Data Streams for property ${propId}...`);
    const res = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${propId}/dataStreams`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
