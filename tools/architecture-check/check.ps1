[CmdletBinding()]
param(
    [string] $Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string] $AllowlistPath = (Join-Path $PSScriptRoot 'allowlist.json')
)

$ErrorActionPreference = 'Stop'
$extensions = @('.rs', '.ts', '.js', '.mjs', '.html', '.css', '.scss', '.ps1')
$forbiddenNames = @('utils.ts', 'utils.rs', 'helpers.ts', 'helpers.rs', 'common.service.ts')
$excludedSegments = @('.git', '.agents', '.angular', 'target', 'node_modules', 'generated', 'dist')
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$scannedCount = 0
$normalizedRoot = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@('\', '/'))
$rootPrefix = $normalizedRoot + [IO.Path]::DirectorySeparatorChar

if (-not (Test-Path -LiteralPath $AllowlistPath -PathType Leaf)) {
    throw "Architecture allowlist not found: $AllowlistPath"
}

$allowlist = @(Get-Content -LiteralPath $AllowlistPath -Raw | ConvertFrom-Json)
foreach ($entry in $allowlist) {
    if ([string]::IsNullOrWhiteSpace($entry.path) -or
        [string]::IsNullOrWhiteSpace($entry.reason) -or
        [string]::IsNullOrWhiteSpace($entry.owner)) {
        $failures.Add('Every allowlist entry needs path, reason, and owner.')
    }
}

function Get-RelativePath {
    param([string] $Path)
    $normalizedPath = [IO.Path]::GetFullPath($Path)
    if (-not $normalizedPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside the architecture root: $Path"
    }
    $normalizedPath.Substring($rootPrefix.Length).Replace('\', '/')
}

function Test-Excluded {
    param([string] $RelativePath)
    $segments = $RelativePath -split '/'
    foreach ($segment in $excludedSegments) {
        if ($segments -contains $segment) { return $true }
    }
    if ($RelativePath -match '(^|/)(Cargo|pnpm|package)-lock\.') { return $true }
    return $false
}

function Test-Allowlisted {
    param([string] $RelativePath)
    foreach ($entry in $allowlist) {
        if ($RelativePath -like ([string]$entry.path)) { return $true }
    }
    return $false
}

function Get-MeaningfulLineCount {
    param([string[]] $Lines)
    @($Lines | Where-Object {
        $trimmed = $_.Trim()
        $trimmed.Length -gt 0 -and -not $trimmed.StartsWith('//')
    }).Count
}

$files = Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object {
    $extensions -contains $_.Extension.ToLowerInvariant()
}

foreach ($file in $files) {
    $relative = Get-RelativePath $file.FullName
    if ((Test-Excluded $relative) -or (Test-Allowlisted $relative)) { continue }
    $scannedCount++

    if ($forbiddenNames -contains $file.Name.ToLowerInvariant()) {
        $failures.Add("Forbidden catch-all filename: $relative")
    }

    if ($relative -match '^apps/mobile/src/app/.+\.(css|scss)$') {
        $failures.Add("Component stylesheet is forbidden; use Tailwind utilities: $relative")
    }

    $lines = @(Get-Content -LiteralPath $file.FullName)
    $lineCount = $lines.Count
    if ($file.Name -eq 'main.rs') {
        $meaningful = Get-MeaningfulLineCount $lines
        if ($meaningful -gt 120) {
            $failures.Add("main.rs exceeds 120 meaningful lines ($meaningful): $relative")
        }
    }
    if ($lineCount -gt 500) {
        $failures.Add("Source file exceeds 500 lines ($lineCount): $relative")
    } elseif ($lineCount -gt 350) {
        $warnings.Add("Source file exceeds 350 lines ($lineCount): $relative")
    }

    $content = $lines -join "`n"
    if ($relative -match '^apps/mobile/src/app/features/.+/ui/.+\.ts$' -and
        $content -match 'HttpClient|indexedDB|EventSource|PushManager') {
        $failures.Add("Angular UI component owns integration logic: $relative")
    }
    if ($relative -match '^apps/desktop/' -and $content -match '0\.0\.0\.0') {
        $failures.Add("Production desktop source contains a non-loopback bind: $relative")
    }
}

foreach ($warning in $warnings) { Write-Warning $warning }
if ($failures.Count -gt 0) {
    foreach ($failure in $failures) { Write-Error $failure -ErrorAction Continue }
    exit 1
}

Write-Host "Architecture check passed: $scannedCount source files scanned."
