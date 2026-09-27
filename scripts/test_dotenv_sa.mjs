import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.production.real" });

const raw = process.env.GSC_SERVICE_ACCOUNT_JSON || "";

const emailMatch = raw.match(/"client_email":\s*"([^"]+)"/);
const projMatch = raw.match(/"project_id":\s*"([^"]+)"/);
const keyMatch = raw.match(/"private_key":\s*"([\s\S]*?)(?:-----END PRIVATE KEY-----\\n"|-----END PRIVATE KEY-----\n")/);

if (emailMatch && projMatch && keyMatch) {
  const privateKey = (keyMatch[1] + "-----END PRIVATE KEY-----\n").replace(/\\n/g, "\n");
  const sa = {
    type: "service_account",
    project_id: projMatch[1],
    client_email: emailMatch[1],
    private_key: privateKey
  };
  console.log("Service Account Email:", sa.client_email);
  console.log("Project ID:", sa.project_id);
  console.log("Private Key length:", sa.private_key.length);
  fs.writeFileSync("sa_temp.json", JSON.stringify(sa, null, 2));
  console.log("Wrote sa_temp.json successfully!");
} else {
  console.log("Regex match failed");
}
