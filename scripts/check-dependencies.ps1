[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
$cargoAudit = Join-Path $env:USERPROFILE '.cargo\bin\cargo-audit.exe'
if (-not (Test-Path -LiteralPath $cargoAudit)) {
    throw 'Thiếu cargo-audit. Cài bằng: cargo install cargo-audit --locked'
}

Push-Location $repoRoot
try {
    & pnpm audit --prod --audit-level high
    if ($LASTEXITCODE -ne 0) { throw 'Production npm audit did not complete successfully.' }
    # web-push-native selects jwt-simple's pure-Rust backend, which compiles rsa 0.9.10.
    # VibePing uses only ES256 VAPID signing and performs no RSA private-key operation,
    # so RUSTSEC-2023-0071's network timing oracle is unreachable. There is no fixed
    # rsa release; keep this single exception visible and fail on any RSA source use.
    $nativeErrorPreference = $PSNativeCommandUseErrorActionPreference
    $PSNativeCommandUseErrorActionPreference = $false
    try {
        $rsaUse = @(& rg -n --no-heading --color never -e 'RS256|RSAKey|rsa::' -- apps/desktop/src spikes/tailscale-web-push/src 2>$null)
        $rsaSearchExitCode = $LASTEXITCODE
    }
    finally {
        $PSNativeCommandUseErrorActionPreference = $nativeErrorPreference
    }
    if ($rsaSearchExitCode -gt 1) {
        throw "RSA source audit failed with exit code $rsaSearchExitCode."
    }
    if ($rsaUse.Count -gt 0) {
        throw "Unexpected RSA use makes RUSTSEC-2023-0071 reachable: $($rsaUse -join '; ')"
    }
    $rsaTree = (& $cargo tree -i rsa --workspace | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the reviewed RSA dependency path.' }
    if ($rsaTree -notmatch 'web-push-native' -or $rsaTree -notmatch 'jwt-simple') {
        throw 'The reviewed RUSTSEC-2023-0071 dependency path has changed.'
    }
    & $cargoAudit audit --deny warnings --ignore RUSTSEC-2023-0071
    if ($LASTEXITCODE -ne 0) { throw 'Rust dependency audit did not complete successfully.' }
    Write-Host 'Reviewed exception: RUSTSEC-2023-0071 is unreachable because VAPID uses ES256 only.'
    Write-Host 'Dependency audits passed.'
}
finally {
    Pop-Location
}
