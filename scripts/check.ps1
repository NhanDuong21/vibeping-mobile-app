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
    & pnpm run generate:contracts
    & pnpm run build:mobile
    & pnpm run lint
    & pnpm run typecheck
    & pnpm run test:mobile
    & pnpm run check:contracts
    & pnpm run build:gate0
    & pnpm run check:js
    & pnpm run check:pwa
    & pnpm run test:gate0
    & $cargo fmt --all -- --check
    & $cargo clippy --workspace --all-targets -- -D warnings
    & $cargo test --workspace
    # Gate 0 may be the live private-origin process; never replace its executable in place.
    & $cargo build -p vibeping -p vibeping-gate1 --release
    & pnpm run e2e
    & (Join-Path $PSScriptRoot 'check-architecture.ps1')
    & (Join-Path $PSScriptRoot 'check-hygiene.ps1')
}
finally {
    Pop-Location
}
