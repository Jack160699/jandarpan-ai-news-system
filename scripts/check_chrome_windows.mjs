import { execSync } from "child_process";

const ps = `Get-Process chrome | Select-Object Id, MainWindowTitle | Where-Object { $_.MainWindowTitle } | ConvertTo-Json`;
const out = execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: 'utf-8' });
console.log("Window Titles of Chrome processes:\n", out);
