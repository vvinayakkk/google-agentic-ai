$ErrorActionPreference = 'Stop'

$root = (Resolve-Path '.').Path
$trDir = Join-Path $root 'farmer_app/assets/translations'

$enBasePath = Join-Path $trDir 'en.json'
$hiBasePath = Join-Path $trDir 'hi.json'
$mrBasePath = Join-Path $trDir 'mr.json'
$enScreenPath = Join-Path $trDir 'en_screens_multilingual_full.json'

$hiScreenOut = Join-Path $trDir 'hi_screens_multilingual_full.json'
$mrScreenOut = Join-Path $trDir 'mr_screens_multilingual_full.json'

$hiKeyOverridesPath = Join-Path $trDir 'hi_screen_glossary_overrides.json'
$mrKeyOverridesPath = Join-Path $trDir 'mr_screen_glossary_overrides.json'
$hiValueOverridesPath = Join-Path $trDir 'hi_screen_value_glossary_overrides.json'
$mrValueOverridesPath = Join-Path $trDir 'mr_screen_value_glossary_overrides.json'

function Read-JsonMap([string]$path) {
  $raw = Get-Content -Raw -Path $path -Encoding utf8
  $obj = $raw | ConvertFrom-Json
  $map = @{}
  foreach ($p in $obj.PSObject.Properties) {
    $map[[string]$p.Name] = [string]$p.Value
  }
  return $map
}

function Read-OptionalJsonMap([string]$path) {
  if (-not (Test-Path $path)) {
    return @{}
  }

  try {
    return Read-JsonMap $path
  } catch {
    Write-Warning ("Failed to read optional glossary: " + $path)
    return @{}
  }
}

function Build-ReverseMap([hashtable]$enMap, [hashtable]$targetMap) {
  $reverse = @{}
  foreach ($k in $enMap.Keys) {
    if (-not $targetMap.ContainsKey($k)) { continue }
    $enVal = ([string]$enMap[$k]).Trim()
    $targetVal = ([string]$targetMap[$k]).Trim()
    if ([string]::IsNullOrWhiteSpace($enVal)) { continue }
    if ([string]::IsNullOrWhiteSpace($targetVal)) { continue }
    if (-not $reverse.ContainsKey($enVal)) {
      $reverse[$enVal] = $targetVal
    }
  }
  return $reverse
}

function Normalize-Lookup([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return '' }
  $n = $value.ToLowerInvariant().Trim()
  $n = $n -replace '\s+', ' '
  return $n
}

function Build-PhraseMap([hashtable]$enMap, [hashtable]$targetMap) {
  $phraseMap = @{}
  foreach ($k in $enMap.Keys) {
    if (-not $targetMap.ContainsKey($k)) { continue }
    $enVal = ([string]$enMap[$k]).Trim()
    $targetVal = ([string]$targetMap[$k]).Trim()
    if ([string]::IsNullOrWhiteSpace($enVal)) { continue }
    if ([string]::IsNullOrWhiteSpace($targetVal)) { continue }
    if ($enVal -eq $targetVal) { continue }

    $norm = Normalize-Lookup $enVal
    if ([string]::IsNullOrWhiteSpace($norm)) { continue }
    if (-not $phraseMap.ContainsKey($norm)) {
      $phraseMap[$norm] = $targetVal
    }
  }
  return $phraseMap
}

function Is-ComplexLiteral([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return $true }

  if ($value -match '\$\{|RoutePaths\.|\.toString\(|\.substring\(|=>') {
    return $true
  }

  if ($value -match 'https?://|^/|\\u[0-9A-Fa-f]{4}|\[\^') {
    return $true
  }

  return $false
}

function Try-AutoTranslate([string]$value, [hashtable]$phraseMap) {
  if ([string]::IsNullOrWhiteSpace($value)) { return '' }
  if (Is-ComplexLiteral $value) { return '' }

  $norm = Normalize-Lookup $value
  if ($phraseMap.ContainsKey($norm)) {
    return [string]$phraseMap[$norm]
  }

  if ($value -match '^(?<stem>.*?)(?<punc>[.!?])$') {
    $stem = [string]$Matches['stem']
    $punc = [string]$Matches['punc']
    $stemNorm = Normalize-Lookup $stem
    if ($phraseMap.ContainsKey($stemNorm)) {
      return ([string]$phraseMap[$stemNorm]) + $punc
    }
  }

  return ''
}

function Write-JsonMap([hashtable]$map, [string]$outPath) {
  $ordered = [ordered]@{}
  foreach ($k in ($map.Keys | Sort-Object)) {
    $ordered[$k] = $map[$k]
  }
  $json = $ordered | ConvertTo-Json -Depth 8
  Set-Content -Path $outPath -Value $json -Encoding utf8
}

$enBase = Read-JsonMap $enBasePath
$hiBase = Read-JsonMap $hiBasePath
$mrBase = Read-JsonMap $mrBasePath
$enScreen = Read-JsonMap $enScreenPath

$hiKeyOverrides = Read-OptionalJsonMap $hiKeyOverridesPath
$mrKeyOverrides = Read-OptionalJsonMap $mrKeyOverridesPath
$hiValueOverrides = Read-OptionalJsonMap $hiValueOverridesPath
$mrValueOverrides = Read-OptionalJsonMap $mrValueOverridesPath

$revHi = Build-ReverseMap -enMap $enBase -targetMap $hiBase
$revMr = Build-ReverseMap -enMap $enBase -targetMap $mrBase

$phraseHi = Build-PhraseMap -enMap $enBase -targetMap $hiBase
$phraseMr = Build-PhraseMap -enMap $enBase -targetMap $mrBase

$hiScreen = @{}
$mrScreen = @{}

$hiFallbackEnglish = 0
$mrFallbackEnglish = 0
$hiAutoTranslated = 0
$mrAutoTranslated = 0
$hiOverrideCount = 0
$mrOverrideCount = 0
$hiValueOverrideCount = 0
$mrValueOverrideCount = 0

foreach ($k in $enScreen.Keys) {
  $enVal = [string]$enScreen[$k]

  if ($hiKeyOverrides.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace([string]$hiKeyOverrides[$k])) {
    $hiScreen[$k] = [string]$hiKeyOverrides[$k]
    $hiOverrideCount++
  } elseif ($hiValueOverrides.ContainsKey($enVal) -and -not [string]::IsNullOrWhiteSpace([string]$hiValueOverrides[$enVal])) {
    $hiScreen[$k] = [string]$hiValueOverrides[$enVal]
    $hiValueOverrideCount++
  } elseif ($hiBase.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace([string]$hiBase[$k])) {
    $hiScreen[$k] = [string]$hiBase[$k]
  } elseif ($revHi.ContainsKey($enVal)) {
    $hiScreen[$k] = [string]$revHi[$enVal]
  } else {
    $hiGuess = Try-AutoTranslate -value $enVal -phraseMap $phraseHi
    if (-not [string]::IsNullOrWhiteSpace($hiGuess) -and $hiGuess -ne $enVal) {
      $hiScreen[$k] = $hiGuess
      $hiAutoTranslated++
    } else {
      $hiScreen[$k] = $enVal
      $hiFallbackEnglish++
    }
  }

  if ($mrKeyOverrides.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace([string]$mrKeyOverrides[$k])) {
    $mrScreen[$k] = [string]$mrKeyOverrides[$k]
    $mrOverrideCount++
  } elseif ($mrValueOverrides.ContainsKey($enVal) -and -not [string]::IsNullOrWhiteSpace([string]$mrValueOverrides[$enVal])) {
    $mrScreen[$k] = [string]$mrValueOverrides[$enVal]
    $mrValueOverrideCount++
  } elseif ($mrBase.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace([string]$mrBase[$k])) {
    $mrScreen[$k] = [string]$mrBase[$k]
  } elseif ($revMr.ContainsKey($enVal)) {
    $mrScreen[$k] = [string]$revMr[$enVal]
  } else {
    $mrGuess = Try-AutoTranslate -value $enVal -phraseMap $phraseMr
    if (-not [string]::IsNullOrWhiteSpace($mrGuess) -and $mrGuess -ne $enVal) {
      $mrScreen[$k] = $mrGuess
      $mrAutoTranslated++
    } else {
      $mrScreen[$k] = $enVal
      $mrFallbackEnglish++
    }
  }
}

Write-JsonMap -map $hiScreen -outPath $hiScreenOut
Write-JsonMap -map $mrScreen -outPath $mrScreenOut

Write-Output ('EN_SCREEN_KEYS=' + $enScreen.Keys.Count)
Write-Output ('HI_SCREEN_KEYS=' + $hiScreen.Keys.Count)
Write-Output ('MR_SCREEN_KEYS=' + $mrScreen.Keys.Count)
Write-Output ('HI_FALLBACK_TO_ENGLISH=' + $hiFallbackEnglish)
Write-Output ('MR_FALLBACK_TO_ENGLISH=' + $mrFallbackEnglish)
Write-Output ('HI_AUTO_TRANSLATED=' + $hiAutoTranslated)
Write-Output ('MR_AUTO_TRANSLATED=' + $mrAutoTranslated)
Write-Output ('HI_GLOSSARY_OVERRIDES=' + $hiOverrideCount)
Write-Output ('MR_GLOSSARY_OVERRIDES=' + $mrOverrideCount)
Write-Output ('HI_VALUE_GLOSSARY_OVERRIDES=' + $hiValueOverrideCount)
Write-Output ('MR_VALUE_GLOSSARY_OVERRIDES=' + $mrValueOverrideCount)
Write-Output ('HI_OUT=' + $hiScreenOut)
Write-Output ('MR_OUT=' + $mrScreenOut)
