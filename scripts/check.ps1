[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'initialize-msvc.ps1')
$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
if (-not (Test-Path -LiteralPath $cargo)) {
    $cargo = (Get-Command cargo -ErrorAction Stop).Source
}

Push-Location $repoRoot
try {
    & pnpm run build:gate0
    & pnpm run check:js
    & pnpm run check:pwa
    & pnpm test
    & $cargo fmt --all -- --check
    & $cargo clippy --workspace --all-targets -- -D warnings
    & $cargo test --workspace
    & $cargo build --workspace --release
    & (Join-Path $PSScriptRoot 'check-architecture.ps1')
    & (Join-Path $PSScriptRoot 'check-hygiene.ps1')
}
finally {
    Pop-Location
}
