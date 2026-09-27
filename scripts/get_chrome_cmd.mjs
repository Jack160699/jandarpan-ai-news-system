import { execSync } from "child_process";

try {
  const output = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  const procs = JSON.parse(output);
  const relevant = Array.isArray(procs) ? procs.filter(p => p.CommandLine && (p.CommandLine.includes('remote-debugging-port') || p.CommandLine.includes('Profile 1') || p.CommandLine.includes('Profile 3'))) : [procs];
  console.log(JSON.stringify(relevant, null, 2));
} catch (e) {
  console.error(e.message);
}
