[CmdletBinding()]
param([int] $Port = 8790)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtime = Join-Path $repoRoot '.runtime\development'
$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
. (Join-Path $PSScriptRoot 'initialize-msvc.ps1')

if (-not (Test-Path -LiteralPath $cargo -PathType Leaf)) {
    $cargo = (Get-Command cargo -ErrorAction Stop).Source
}

New-Item -ItemType Directory -Path $runtime -Force | Out-Null
Push-Location $repoRoot
try {
    & pnpm run generate:contracts
    & pnpm run build:mobile
    & $cargo run -p vibeping -- --port $Port --data-dir $runtime
}
finally {
    Pop-Location
}
