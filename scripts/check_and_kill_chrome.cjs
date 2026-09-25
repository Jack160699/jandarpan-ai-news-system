const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || e.message;
  }
}

const psScript = `Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Json`;
const out = run(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`);
try {
  const procs = JSON.parse(out);
  const list = Array.isArray(procs) ? procs : [procs];
  console.log(`Found ${list.length} Chrome processes:`);
  for (const p of list) {
    console.log(`PID: ${p.ProcessId}, Parent: ${p.ParentProcessId}`);
    if (p.CommandLine) {
      console.log(`  Cmd: ${p.CommandLine.slice(0, 140)}...`);
    }
  }
} catch (e) {
  console.log("Raw output:", out);
}
