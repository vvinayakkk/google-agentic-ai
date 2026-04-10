$ErrorActionPreference = 'Stop'

$root = (Resolve-Path '.').Path
$trDir = Join-Path $root 'farmer_app/assets/translations'

$enPath = Join-Path $trDir 'en_screens_multilingual_full.json'
$hiPath = Join-Path $trDir 'hi_screens_multilingual_full.json'
$mrPath = Join-Path $trDir 'mr_screens_multilingual_full.json'
$outPath = Join-Path $trDir 'hi_mr_fallback_report.txt'

function Read-JsonMap([string]$path) {
  $raw = Get-Content -Raw -Path $path -Encoding utf8
  $obj = $raw | ConvertFrom-Json
  $map = @{}
  foreach ($p in $obj.PSObject.Properties) {
    $map[[string]$p.Name] = [string]$p.Value
  }
  return $map
}

function Is-UserVisible([string]$key, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return $false }
  if ($value.Length -lt 2) { return $false }

  if ($value -match '\$\{|RoutePaths\.|\.toString\(|\.substring\(|=>') { return $false }
  if ($value -match 'https?://|^/|\\u[0-9A-Fa-f]{4}|\[\^') { return $false }
  if ($value -match '^[a-z0-9_]+$') { return $false }

  # Prioritize labels/messages over highly technical extracted strings.
  if ($key -match '\.(text|title|subtitle|description|label|message|hint|error|summary)$') { return $true }
  if ($value -match '[A-Za-z]' -and $value -match '\s') { return $true }

  return $value -match '^[A-Za-z][A-Za-z0-9\s,./&()\-]{2,}$'
}

$en = Read-JsonMap $enPath
$hi = Read-JsonMap $hiPath
$mr = Read-JsonMap $mrPath

$fallbackBoth = New-Object System.Collections.Generic.List[object]
foreach ($k in $en.Keys) {
  $enVal = [string]$en[$k]
  $hiVal = if ($hi.ContainsKey($k)) { [string]$hi[$k] } else { '' }
  $mrVal = if ($mr.ContainsKey($k)) { [string]$mr[$k] } else { '' }

  if ($hiVal -eq $enVal -and $mrVal -eq $enVal) {
    $fallbackBoth.Add([pscustomobject]@{
      key = $k
      en = $enVal
      visible = (Is-UserVisible -key $k -value $enVal)
      length = $enVal.Length
    })
  }
}

$visible = $fallbackBoth | Where-Object { $_.visible }
$ranked = $visible |
  Sort-Object @{ Expression = { -1 * $_.length } }, @{ Expression = { $_.key } }

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('Hindi/Marathi Screen Fallback Report')
$lines.Add('Generated: ' + (Get-Date -Format o))
$lines.Add('')
$lines.Add('Total screen keys: ' + $en.Keys.Count)
$lines.Add('Fallback in both hi and mr: ' + $fallbackBoth.Count)
$lines.Add('User-visible fallback candidates: ' + $visible.Count)
$lines.Add('')
$lines.Add('Top 300 user-visible fallback entries:')

foreach ($row in ($ranked | Select-Object -First 300)) {
  $lines.Add($row.key + ' | ' + $row.en)
}

Set-Content -Path $outPath -Value $lines -Encoding utf8

Write-Output ('TOTAL_KEYS=' + $en.Keys.Count)
Write-Output ('FALLBACK_BOTH=' + $fallbackBoth.Count)
Write-Output ('VISIBLE_FALLBACK=' + $visible.Count)
Write-Output ('REPORT=' + $outPath)
