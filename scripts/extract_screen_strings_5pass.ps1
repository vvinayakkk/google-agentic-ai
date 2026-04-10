$ErrorActionPreference = 'Stop'

$root = (Resolve-Path '.').Path
$listPath = Join-Path $root 'farmer_app_screens_file_list.txt'
$outPath = Join-Path $root 'farmer_app/assets/translations/en_screens_multilingual_full.json'
$auditPath = Join-Path $root 'farmer_app/assets/translations/en_screens_multilingual_audit.txt'

if (-not (Test-Path $listPath)) {
  throw "Missing list file: $listPath"
}

$screenLines = Get-Content -Path $listPath -Encoding utf8 | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

$map = @{}
$meta = New-Object System.Collections.Generic.List[object]
$seen = @{}
$passAdds = @{
  1 = 0
  2 = 0
  3 = 0
  4 = 0
  5 = 0
}

function Normalize-Text {
  param([string]$Text)
  if ($null -eq $Text) { return '' }
  $t = $Text -replace "`r", ""
  $t = $t -replace "\t", ' '
  $t = $t -replace '\\n', "`n"
  $t = $t -replace '\\r', ''
  $t = $t -replace '\\t', ' '
  $t = $t -replace '\\"', '"'
  $t = $t -replace "\\'", "'"
  $t = $t -replace '\\`', '`'
  $t = $t -replace ' {2,}', ' '
  return $t.Trim()
}

function Decode-Literal {
  param([string]$Literal)
  if ([string]::IsNullOrWhiteSpace($Literal)) { return '' }

  $raw = $Literal.Trim()
  if ($raw.StartsWith('r"""') -and $raw.EndsWith('"""')) {
    return Normalize-Text ($raw.Substring(4, $raw.Length - 7))
  }
  if ($raw.StartsWith("r'''") -and $raw.EndsWith("'''")) {
    return Normalize-Text ($raw.Substring(4, $raw.Length - 7))
  }
  if ($raw.StartsWith('"""') -and $raw.EndsWith('"""')) {
    return Normalize-Text ($raw.Substring(3, $raw.Length - 6))
  }
  if ($raw.StartsWith("'''") -and $raw.EndsWith("'''")) {
    return Normalize-Text ($raw.Substring(3, $raw.Length - 6))
  }
  if ($raw.StartsWith('r"') -and $raw.EndsWith('"')) {
    return Normalize-Text ($raw.Substring(2, $raw.Length - 3))
  }
  if ($raw.StartsWith("r'") -and $raw.EndsWith("'")) {
    return Normalize-Text ($raw.Substring(2, $raw.Length - 3))
  }
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) {
    return Normalize-Text ($raw.Substring(1, $raw.Length - 2))
  }
  if ($raw.StartsWith("'") -and $raw.EndsWith("'")) {
    return Normalize-Text ($raw.Substring(1, $raw.Length - 2))
  }
  return Normalize-Text $raw
}

function Is-User-Facing {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) { return $false }
  $t = $Text.Trim()

  if ($t.Length -lt 2) { return $false }
  if ($t -match '^[\{\}\[\]\(\),.:;_\-+=/*#@!`~|<> ]+$') { return $false }

  if ($t -match '^[a-z0-9_]+(\.[a-z0-9_]+)+$') { return $false }
  if ($t -match '^(package:|dart:|assets/|lib/|/api/|https?://|whatsapp:|tel:)') { return $false }
  if ($t -match '\.(dart|png|jpg|jpeg|svg|json|yaml|yml|arb)$') { return $false }
  if ($t -match '^[A-Za-z_][A-Za-z0-9_]*$' -and $t.Length -gt 30) { return $false }

  return $true
}

function Make-Key {
  param(
    [string]$ScreenRel,
    [string]$Value,
    [hashtable]$MapRef
  )

  $screenName = [System.IO.Path]::GetFileNameWithoutExtension($ScreenRel).ToLowerInvariant()
  $slug = $Value.ToLowerInvariant()
  $slug = $slug -replace '[^a-z0-9]+', '_'
  $slug = $slug.Trim('_')
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = 'text' }
  if ($slug.Length -gt 52) { $slug = $slug.Substring(0, 52).Trim('_') }
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = 'text' }

  $base = "screen.$screenName.$slug"
  $candidate = $base
  $i = 2
  while ($MapRef.Contains($candidate)) {
    $candidate = "$base`_$i"
    $i++
  }
  return $candidate
}

function Add-Entry {
  param(
    [string]$ScreenRel,
    [string]$Value,
    [int]$Pass,
    [string]$Context,
    [hashtable]$MapRef,
    [hashtable]$SeenRef,
    [System.Collections.Generic.List[object]]$MetaRef,
    [hashtable]$PassAddsRef
  )

  $val = Normalize-Text $Value
  if (-not (Is-User-Facing $val)) { return }

  $fingerprint = "$ScreenRel`n$val"
  if ($SeenRef.ContainsKey($fingerprint)) { return }

  $key = Make-Key -ScreenRel $ScreenRel -Value $val -MapRef $MapRef
  $MapRef[$key] = $val
  $SeenRef[$fingerprint] = $true
  $PassAddsRef[$Pass] = [int]$PassAddsRef[$Pass] + 1

  $MetaRef.Add([pscustomobject]@{
    pass = $Pass
    key = $key
    screen = $ScreenRel
    context = $Context
    value = $val
  })
}

function Extract-By-Regex {
  param(
    [string]$Content,
    [string]$ScreenRel,
    [int]$Pass,
    [string]$Context,
    [string]$Regex
  )

  $matches = [regex]::Matches($Content, $Regex, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  foreach ($m in $matches) {
    $lit = $m.Groups['q'].Value
    if ([string]::IsNullOrWhiteSpace($lit)) { continue }
    $decoded = Decode-Literal $lit
    Add-Entry -ScreenRel $ScreenRel -Value $decoded -Pass $Pass -Context $Context -MapRef $map -SeenRef $seen -MetaRef $meta -PassAddsRef $passAdds
  }
}

$litPattern = @'
r?'''[\s\S]*?'''|r?"""[\s\S]*?"""|r?'(?:\\.|[^'\\])*'|r?"(?:\\.|[^"\\])*"
'@

$regexAnyLiteral = '(?<q>' + $litPattern + ')'
$rxTextWidget = '(?:Text|SelectableText|TextSpan|AutoSizeText)\s*\(\s*(?<q>' + $litPattern + ')'
$rxNamedText = '\b(?:text|title|subtitle|label|body|message)\s*:\s*(?<q>' + $litPattern + ')'
$rxInput = '\b(?:hintText|labelText|helperText|errorText|counterText|tooltip|semanticLabel|headerText|emptyTitle|emptySubtitle|emptyActionLabel)\s*:\s*(?<q>' + $litPattern + ')'
$rxSnack = '(?:showSnack|showToast|showError|showSuccess)\s*\(\s*(?<q>' + $litPattern + ')'
$rxDialog = '(?:AlertDialog|SimpleDialog|CupertinoAlertDialog|SnackBar)\b[\s\S]{0,600}?Text\s*\(\s*(?<q>' + $litPattern + ')'
$rxButton = '(?:ElevatedButton|OutlinedButton|TextButton|FilledButton)\s*\.[A-Za-z]+\([\s\S]{0,400}?label\s*:\s*Text\s*\(\s*(?<q>' + $litPattern + ')'
$rxDataMap = '["' + "'" + '](?:title|subtitle|label|name|desc|description|message|question|answer|valueEstimate|chatPrompt|hint|body|note|cta|button)["' + "'" + ']\s*:\s*(?<q>' + $litPattern + ')'

foreach ($screenRel in $screenLines) {
  $abs = Join-Path $root ($screenRel -replace '/', '\\')
  if (-not (Test-Path $abs)) { continue }

  $content = Get-Content -Path $abs -Raw -Encoding utf8

  # Pass 1: Text-oriented widgets and visible labels.
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 1 -Context 'text_widget' -Regex $rxTextWidget
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 1 -Context 'named_text' -Regex $rxNamedText

  # Pass 2: Input and accessibility strings.
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 2 -Context 'input_decoration' -Regex $rxInput

  # Pass 3: Toast/snackbar/dialog and action flows.
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 3 -Context 'snackbar' -Regex $rxSnack
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 3 -Context 'dialog' -Regex $rxDialog
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 3 -Context 'button' -Regex $rxButton

  # Pass 4: Structured maps/lists often rendered in cards or tiles.
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 4 -Context 'data_map' -Regex $rxDataMap

  # Pass 5: Brutal fallback - all literals with technical filtering.
  Extract-By-Regex -Content $content -ScreenRel $screenRel -Pass 5 -Context 'fallback_literal' -Regex $regexAnyLiteral
}

# Final cleanup to remove obvious technical leftovers missed by filters.
$technicalPatterns = @(
  '^common\.',
  '^login\.',
  '^register\.',
  '^profile\.',
  '^settings\.',
  '^home\.',
  '^features\.',
  '^chat\.',
  '^speech_to_text\.',
  '^fetching_location\.',
  '^farmer_profile\.',
  '^mental_health\.',
  '^weather\.',
  '^soil_'
)

$toRemove = New-Object System.Collections.Generic.List[string]
$preCleanupCount = $map.Count
foreach ($k in $map.Keys) {
  $v = [string]$map[$k]
  foreach ($pat in $technicalPatterns) {
    if ($v -match $pat) {
      $toRemove.Add($k)
      break
    }
  }
}

foreach ($rk in $toRemove) {
  $map.Remove($rk)
}

$postCleanupCount = $map.Count

$ordered = [ordered]@{}
foreach ($k in ($map.Keys | Sort-Object)) {
  $ordered[$k] = $map[$k]
}

$json = $ordered | ConvertTo-Json -Depth 10
Set-Content -Path $outPath -Value $json -Encoding utf8

$byPass = @()
for ($i = 1; $i -le 5; $i++) {
  $byPass += "Pass $i added: $($passAdds[$i])"
}

$auditLines = New-Object System.Collections.Generic.List[string]
$auditLines.Add("Screen string extraction audit")
$auditLines.Add("Generated: $(Get-Date -Format o)")
$auditLines.Add("Screens scanned: $($screenLines.Count)")
$auditLines.Add("Total keys: $($ordered.Count)")
foreach ($line in $byPass) {
  $auditLines.Add([string]$line)
}
$auditLines.Add('')
$auditLines.Add('Entries:')

foreach ($m in ($meta | Sort-Object pass, screen, key)) {
  if ($ordered.Contains($m.key)) {
    $auditLines.Add("P$($m.pass) | $($m.key) | $($m.screen) | $($m.value)")
  }
}

Set-Content -Path $auditPath -Value $auditLines -Encoding utf8

Write-Output ("OUTPUT_JSON=" + $outPath)
Write-Output ("OUTPUT_AUDIT=" + $auditPath)
Write-Output ("PRE_CLEANUP_KEYS=" + $preCleanupCount)
Write-Output ("REMOVED_KEYS=" + $toRemove.Count)
Write-Output ("TOTAL_KEYS=" + $ordered.Count)
Write-Output ("PASS1=" + $passAdds[1])
Write-Output ("PASS2=" + $passAdds[2])
Write-Output ("PASS3=" + $passAdds[3])
Write-Output ("PASS4=" + $passAdds[4])
Write-Output ("PASS5=" + $passAdds[5])