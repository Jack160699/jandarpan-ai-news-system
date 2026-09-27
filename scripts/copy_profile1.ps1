$src = "C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data"
$dst = "C:\Users\shriyansh chandrakar\AppData\Local\Temp\ChromeTempProfile1"
if (Test-Path $dst) {
    Remove-Item -Recurse -Force $dst -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\Local State" "$dst\Local State" -Force
$p1Dst = "$dst\Profile 1"
New-Item -ItemType Directory -Force -Path $p1Dst | Out-Null

$items = Get-ChildItem "$src\Profile 1" -Exclude "lockfile","*lock*","*.tmp","Singleton*"
foreach ($item in $items) {
    try {
        Copy-Item -Path $item.FullName -Destination $p1Dst -Recurse -Force -ErrorAction SilentlyContinue
    } catch {}
}
Write-Output "Copy completed"
