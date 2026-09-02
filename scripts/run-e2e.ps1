[CmdletBinding()]
param([switch] $SkipBuild)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $repoRoot
try {
    if (-not $SkipBuild) {
        & (Join-Path $PSScriptRoot 'build-release.ps1')
        if ($LASTEXITCODE -ne 0) { throw 'Release build chưa hoàn tất.' }
    }
    & pnpm run e2e
    if ($LASTEXITCODE -ne 0) { throw 'Playwright chưa hoàn tất.' }
    Write-Host 'Playwright production E2E đã đạt.'
}
finally {
    Pop-Location
}
