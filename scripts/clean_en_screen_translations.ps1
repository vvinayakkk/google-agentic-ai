$ErrorActionPreference = 'Stop'

$root = (Resolve-Path '.').Path
$trDir = Join-Path $root 'farmer_app/assets/translations'
$inPath = Join-Path $trDir 'en_screens_multilingual_full.json'
$auditPath = Join-Path $trDir 'en_screens_multilingual_cleanup_audit.txt'

if (-not (Test-Path $inPath)) {
  throw "Missing input file: $inPath"
}

function Normalize-Value([string]$value) {
  if ($null -eq $value) { return '' }

  $v = $value

  $v = $v -replace "`r", ''
  $v = $v -replace '[ ]{2,}', ' '
  return $v.Trim()
}

function Get-RemovalReason([string]$key, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return 'empty'
  }

  if ($value -match '^\$\{[^\}]*$') {
    return 'incomplete_interpolation'
  }

  if ($value -match 'RoutePaths\.|\.toString\(|\.substring\(') {
    return 'code_expression'
  }

  if ($value -match 'Widget|context\.textTheme|FontWeight|Alignment\.|AppSpacing|setState\(') {
    return 'code_block_fragment'
  }

  if ($value -match '^\s*\^' -or $value -match '\\d|\\s|\\u[0-9A-Fa-f]{4}') {
    return 'regex_literal'
  }

  if ($value -match '^[a-z]+(_[a-z0-9]+)+$') {
    return 'snake_case_token'
  }

  if ($value -match '^\/[a-z0-9_\-/]+$') {
    return 'route_path'
  }

  if ($value -match '^[\[\]\{\}\(\),.:;]+$') {
    return 'punctuation_only'
  }

  if ($key -match '\.(text|text_2|tr)$' -and $value.Length -le 3) {
    return 'opaque_text_token'
  }

  return ''
}

$raw = Get-Content -Raw -Path $inPath -Encoding utf8
$obj = $raw | ConvertFrom-Json

$kept = @{}
$removed = New-Object System.Collections.Generic.List[object]
$normalizedCount = 0

foreach ($p in $obj.PSObject.Properties) {
  $k = [string]$p.Name
  $orig = [string]$p.Value
  $norm = Normalize-Value $orig

  if ($norm -ne $orig) {
    $normalizedCount++
  }

  $reason = Get-RemovalReason -key $k -value $norm
  if (-not [string]::IsNullOrWhiteSpace($reason)) {
    $removed.Add([pscustomobject]@{
      key = $k
      value = $norm
      reason = $reason
    })
    continue
  }

  $kept[$k] = $norm
}

$ordered = [ordered]@{}
foreach ($k in ($kept.Keys | Sort-Object)) {
  $ordered[$k] = $kept[$k]
}

$json = $ordered | ConvertTo-Json -Depth 10
Set-Content -Path $inPath -Value $json -Encoding utf8

$reasonCounts = @{}
foreach ($r in $removed) {
  if (-not $reasonCounts.ContainsKey($r.reason)) {
    $reasonCounts[$r.reason] = 0
  }
  $reasonCounts[$r.reason] = [int]$reasonCounts[$r.reason] + 1
}

$audit = New-Object System.Collections.Generic.List[string]
$audit.Add("Generated: $(Get-Date -Format o)")
$audit.Add("Input file: $inPath")
$audit.Add("Total input keys: $($obj.PSObject.Properties.Count)")
$audit.Add("Kept keys: $($ordered.Count)")
$audit.Add("Removed keys: $($removed.Count)")
$audit.Add("Normalized values: $normalizedCount")
$audit.Add('')
$audit.Add('Removed by reason:')
foreach ($rk in ($reasonCounts.Keys | Sort-Object)) {
  $audit.Add("- ${rk}: $($reasonCounts[$rk])")
}
$audit.Add('')
$audit.Add('Removed entries (first 300):')
foreach ($row in ($removed | Select-Object -First 300)) {
  $audit.Add("$($row.reason) | $($row.key) | $($row.value)")
}

Set-Content -Path $auditPath -Value $audit -Encoding utf8

Write-Output ('INPUT_KEYS=' + $obj.PSObject.Properties.Count)
Write-Output ('KEPT_KEYS=' + $ordered.Count)
Write-Output ('REMOVED_KEYS=' + $removed.Count)
Write-Output ('NORMALIZED_VALUES=' + $normalizedCount)
Write-Output ('AUDIT=' + $auditPath)
