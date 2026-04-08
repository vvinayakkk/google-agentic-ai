<#
.SYNOPSIS
    Zip specified folders excluding .gitignore entries (uses git when available).

.DESCRIPTION
    Creates a ZIP archive containing only files tracked by git from the given
    target folders. If git is not available the script falls back to a small
    default exclude list (may include some files normally ignored by .gitignore).

.PARAMETER Targets
    Array of folder paths (relative to repo root or absolute). Defaults to
    farmer_app and kisankiawaz-backend.

.PARAMETER RepoRoot
    Path of the repository root. Defaults to script directory.

.PARAMETER OutDir
    Destination directory for the archive. Defaults to the user's Downloads folder.

.EXAMPLE
    # run from the repo root
    .\zip-repos.ps1

    # specify targets and outdir
    .\zip-repos.ps1 -Targets 'farmer_app','kisankiawaz-backend' -OutDir "$env:USERPROFILE\Downloads"
#>

param(
    [string[]] $Targets = @('farmer_app','kisankiawaz-backend'),
    [string] $RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [string] $OutDir = (Join-Path $env:USERPROFILE 'Downloads'),
    [string] $ArchiveName = '',
    [switch] $UseGit = $true
)

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ([string]::IsNullOrWhiteSpace($ArchiveName)) {
    $safeName = ($Targets -join '-') -replace '\s+','_'
    $ArchiveName = "$safeName-$Timestamp.zip"
}
$OutPath = Join-Path -Path $OutDir -ChildPath $ArchiveName

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$RepoRoot = (Resolve-Path -Path $RepoRoot).Path.TrimEnd('\')

function Get-GitAvailable { return (Get-Command git -ErrorAction SilentlyContinue) -ne $null }

function Get-TrackedFilesInTarget {
    param(
        [string] $RepoRootParam,
        [string] $TargetParam
    )
    if (-not ([System.IO.Path]::IsPathRooted($TargetParam))) {
        $targetFull = Join-Path $RepoRootParam $TargetParam
        $targetRel = $targetFull.Substring($RepoRootParam.Length).TrimStart('\','/').Replace('\','/')
    } else {
        try { $targetFull = (Resolve-Path -Path $TargetParam).Path } catch { return @() }
        if ($targetFull.StartsWith($RepoRootParam, [System.StringComparison]::OrdinalIgnoreCase)) {
            $targetRel = $targetFull.Substring($RepoRootParam.Length).TrimStart('\','/').Replace('\','/')
        } else { return @() }
    }

    Push-Location $RepoRootParam
    try {
        $out = & git ls-files -- $targetRel 2>$null
        if ($LASTEXITCODE -ne 0) { return @() }
        $files = $out -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        $abs = $files | ForEach-Object { Join-Path $RepoRootParam $_ }
        return $abs
    } finally { Pop-Location }
}

$DefaultExcludes = @(
    '.git', '.gitignore', '.gitmodules',
    'node_modules','bin','obj','build','dist','target',
    '.env','.env.*','*.env','*.pyc','*.class','.DS_Store','Thumbs.db'
)

function Is-Excluded-ByDefault {
    param([string]$FullPath)
    foreach ($e in $DefaultExcludes) {
        if ($e.Contains('*')) {
            if ((Split-Path $FullPath -Leaf) -like $e) { return $true }
        } else {
            if ($FullPath -like "*\\$e\\*" -or (Split-Path $FullPath -Leaf) -eq $e) { return $true }
        }
    }
    return $false
}

$AllFilesToAdd = [System.Collections.Generic.List[string]]::new()
$gitAvailable = Get-GitAvailable
if (-not $gitAvailable -and $UseGit) { Write-Warning 'git not found. Falling back to basic excludes.' }

foreach ($t in $Targets) {
    if ([string]::IsNullOrWhiteSpace($t)) { continue }
    $targetPath = if ([System.IO.Path]::IsPathRooted($t)) { $t } else { Join-Path $RepoRoot $t }
    if (-not (Test-Path $targetPath)) { Write-Warning "Target not found: $targetPath"; continue }

    if ($gitAvailable -and $UseGit) {
        $files = Get-TrackedFilesInTarget -RepoRootParam $RepoRoot -TargetParam $t
        if ($files -and $files.Count -gt 0) { $files | ForEach-Object { $AllFilesToAdd.Add((Resolve-Path $_).Path) }; continue }
    }

    Get-ChildItem -Path $targetPath -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        if (-not (Is-Excluded-ByDefault $_.FullName)) { $AllFilesToAdd.Add($_.FullName) }
    }
}

if ($AllFilesToAdd.Count -eq 0) { Write-Error 'No files selected for archive.'; exit 1 }

$zipPath = $OutPath
if (Test-Path $zipPath) { Remove-Item $zipPath -Force -ErrorAction SilentlyContinue }

# Try to use the .NET ZipArchive API first, otherwise fall back to Compress-Archive
$compressionAvailable = $false
$zip = $null
$stream = $null

try {
    try { Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop } catch {}
    if ([System.Type]::GetType('System.IO.Compression.ZipArchive') -ne $null) { $compressionAvailable = $true }
    if (-not $compressionAvailable) {
        try { [Reflection.Assembly]::Load('System.IO.Compression.FileSystem') | Out-Null } catch {}
        try { [Reflection.Assembly]::Load('System.IO.Compression') | Out-Null } catch {}
        if ([System.Type]::GetType('System.IO.Compression.ZipArchive') -ne $null) { $compressionAvailable = $true }
    }
} catch { }

if ($compressionAvailable) {
    try {
        $stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
        $zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

        foreach ($file in $AllFilesToAdd) {
            if (-not ($file.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase))) {
                $rel = (Split-Path $file -Leaf)
            } else {
                $rel = $file.Substring($RepoRoot.Length).TrimStart('\','/').Replace('\','/')
            }
            $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
            $entryStream = $entry.Open()
            $fileStream = [System.IO.File]::Open($file, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
            try { $fileStream.CopyTo($entryStream) } finally { $fileStream.Dispose(); $entryStream.Dispose() }
        }
    } catch {
        Write-Warning "Failed to use .NET compression APIs: $($_.Exception.Message)"
        if ($null -ne $zip) { $zip.Dispose(); $zip = $null }
        if ($null -ne $stream) { $stream.Dispose(); $stream = $null }
        if (Test-Path $zipPath) { Remove-Item $zipPath -ErrorAction SilentlyContinue }
        $compressionAvailable = $false
    } finally {
        if ($null -ne $zip) { $zip.Dispose() }
        if ($null -ne $stream) { $stream.Dispose() }
    }
}

if (-not $compressionAvailable) {
    if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
        $tempDir = Join-Path $env:TEMP "ziprepos_$Timestamp"
        if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue }
        New-Item -ItemType Directory -Path $tempDir | Out-Null

        foreach ($file in $AllFilesToAdd) {
            if (-not ($file.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase))) {
                $rel = (Split-Path $file -Leaf)
            } else {
                $rel = $file.Substring($RepoRoot.Length).TrimStart('\','/').Replace('/','\')
            }
            $destPath = Join-Path $tempDir $rel
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Copy-Item -Path $file -Destination $destPath -Force
        }

        try {
            Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force
        } catch {
            Write-Error "Compress-Archive failed: $($_.Exception.Message)"
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
            exit 1
        } finally {
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
        }
    } else {
        Write-Error 'No supported compression method found (.NET ZipArchive or Compress-Archive).'
        exit 1
    }
}

if (Test-Path $zipPath) { Write-Output "Created archive: $zipPath" } else { Write-Error "Archive not created."; exit 1 }
