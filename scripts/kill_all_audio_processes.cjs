const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || e.message;
  }
}

console.log("=== INSPECTING PROCESSES FOR BACKGROUND AUDIO ===");

// 1. Find all chrome processes and their command line
const wmicChrome = run('wmic process where "name=\'chrome.exe\'" get processid,commandline /format:csv');
const lines = wmicChrome.split('\r\n').filter(Boolean);

const automationPids = [];
for (const line of lines) {
  if (line.includes('--autoplay-policy') || line.includes('--remote-debugging') || line.includes('--headless') || line.includes('disable-setuid-sandbox') || line.includes('jandarpan')) {
    const parts = line.split(',');
    const pid = parts[parts.length - 1]?.trim();
    if (pid && !isNaN(pid)) {
      automationPids.push(pid);
      console.log(`Found automation Chrome process: PID ${pid}`);
    }
  }
}

// 2. Kill all automation Chrome processes
for (const pid of automationPids) {
  console.log(`Killing Chrome PID ${pid}...`);
  run(`taskkill /F /T /PID ${pid}`);
}

// Check PID 11448 and 24696 specifically
console.log("Explicitly killing 11448 and 24696 if still running...");
run('taskkill /F /T /PID 11448');
run('taskkill /F /T /PID 24696');

// Check any node script in scratch directory
const wmicNode = run('wmic process where "name=\'node.exe\'" get processid,commandline /format:csv');
const nodeLines = wmicNode.split('\r\n').filter(Boolean);
for (const line of nodeLines) {
  if (line.includes('jandarpan-ai-news-system') || line.includes('verify_') || line.includes('capture_')) {
    const parts = line.split(',');
    const pid = parts[parts.length - 1]?.trim();
    if (pid && pid !== String(process.pid) && !isNaN(pid)) {
      console.log(`Killing test node PID ${pid}...`);
      run(`taskkill /F /T /PID ${pid}`);
    }
  }
}

console.log("Done checking and terminating background audio processes.");
