import { execSync } from "child_process";

const ps = `Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json`;
const out = execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: 'utf-8', maxBuffer: 15 * 1024 * 1024 });
const procs = JSON.parse(out);
for (const p of procs) {
  if (p.CommandLine && !p.CommandLine.includes('--type=')) {
    console.log(`MAIN BROWSER PID: ${p.ProcessId}`);
    console.log(`CommandLine: ${p.CommandLine}\n`);
  }
}
