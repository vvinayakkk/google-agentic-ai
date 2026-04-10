$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$screensPath = Join-Path $root 'farmer_app_screens_file_list.txt'
$mapPath = Join-Path $root 'farmer_app/assets/translations/en_screens_multilingual_full.json'

$screens = Get-Content $screensPath -Encoding utf8 | Where-Object { $_.Trim() -ne '' }
$mapObj = Get-Content -Raw $mapPath -Encoding utf8 | ConvertFrom-Json

$values = @{}
foreach ($p in $mapObj.PSObject.Properties) {
  $values[[string]$p.Value] = $true
}

$litPattern = @'
r?'''[\s\S]*?'''|r?"""[\s\S]*?"""|r?'(?:\\.|[^'\\])*'|r?"(?:\\.|[^"\\])*"
'@
$litRegex = [regex]::new($litPattern)

function Decode-Literal([string]$raw) {
  $t = $raw.Trim()

  if ($t.StartsWith('r"""') -and $t.EndsWith('"""')) { $t = $t.Substring(4, $t.Length - 7) }
  elseif ($t.StartsWith("r'''") -and $t.EndsWith("'''")) { $t = $t.Substring(4, $t.Length - 7) }
  elseif ($t.StartsWith('"""') -and $t.EndsWith('"""')) { $t = $t.Substring(3, $t.Length - 6) }
  elseif ($t.StartsWith("'''") -and $t.EndsWith("'''")) { $t = $t.Substring(3, $t.Length - 6) }
  elseif ($t.StartsWith('r"') -and $t.EndsWith('"')) { $t = $t.Substring(2, $t.Length - 3) }
  elseif ($t.StartsWith("r'") -and $t.EndsWith("'")) { $t = $t.Substring(2, $t.Length - 3) }
  elseif ($t.StartsWith('"') -and $t.EndsWith('"')) { $t = $t.Substring(1, $t.Length - 2) }
  elseif ($t.StartsWith("'") -and $t.EndsWith("'")) { $t = $t.Substring(1, $t.Length - 2) }

  $t = $t -replace "`r", ''
  $t = $t -replace '\\n', "`n"
  $t = $t -replace '\\t', ' '
  $t = $t -replace ' {2,}', ' '
  return $t.Trim()
}

function Is-UserFacing([string]$t) {
  if ([string]::IsNullOrWhiteSpace($t)) { return $false }
  if ($t.Length -lt 2) { return $false }
  if ($t -match '^[a-z0-9_]+(\.[a-z0-9_]+)+$') { return $false }
  if ($t -match '^(package:|dart:|assets/|lib/|/api/|https?://|whatsapp:|tel:)') { return $false }
  if ($t -match '\.(dart|png|jpg|jpeg|svg|json|yaml|yml|arb)$') { return $false }
  return $true
}

$missing = New-Object System.Collections.Generic.List[string]

foreach ($rel in $screens) {
  $path = Join-Path $root ($rel -replace '/', '\\')
  if (-not (Test-Path $path)) { continue }

  $content = Get-Content -Raw $path -Encoding utf8
  $matches = $litRegex.Matches($content)

  foreach ($m in $matches) {
    $v = Decode-Literal $m.Value
    if (-not (Is-UserFacing $v)) { continue }

    if (-not $values.ContainsKey($v)) {
      $missing.Add($rel + ' | ' + $v)
      if ($missing.Count -ge 80) { break }
    }
  }

  if ($missing.Count -ge 80) { break }
}

Write-Output ('UNMATCHED_SAMPLE_COUNT=' + $missing.Count)
$missing | Select-Object -First 80 | ForEach-Object { Write-Output $_ }
