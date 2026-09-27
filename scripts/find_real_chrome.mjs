import { execSync } from "child_process";

const ps = `Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe'\\" | Where-Object { $_.CommandLine -like '*User Data*' } | Select-Object ProcessId, CommandLine | ConvertTo-Json`;
try {
  const out = execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  console.log("Processes using real Chrome User Data:\n", out);
} catch (e) {
  console.error("Error:", e.message);
}
