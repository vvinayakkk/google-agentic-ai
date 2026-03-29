param(
  [string]$ProjectPath = "farmer_app",
  [int]$Port = 8000,
  [switch]$NoFlutterRun
)

$ErrorActionPreference = "Stop"

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  throw "adb not found at $adb"
}

Write-Host "Starting adb server..."
& $adb start-server | Out-Null

$devices = & $adb devices
$attached = $devices | Where-Object { $_ -match "\sdevice$" }
if (-not $attached) {
  throw "No Android device detected. Connect your phone with USB debugging enabled."
}

Write-Host "Resetting adb reverse mappings..."
& $adb reverse --remove-all | Out-Null

Write-Host "Creating reverse tcp:$Port -> tcp:$Port"
& $adb reverse "tcp:$Port" "tcp:$Port" | Out-Null

$reverseList = & $adb reverse --list
if (-not ($reverseList -match "tcp:$Port\s+tcp:$Port")) {
  throw "Failed to create adb reverse mapping for port $Port"
}

Write-Host "ADB reverse active:"
$reverseList

if ($NoFlutterRun) {
  Write-Host "Tunnel setup complete. Skipping flutter run due to -NoFlutterRun."
  exit 0
}

Push-Location $ProjectPath
try {
  Write-Host "Launching Flutter app in USB mode..."
  flutter run --dart-define=ANDROID_NETWORK_MODE=usb
}
finally {
  Pop-Location
}
