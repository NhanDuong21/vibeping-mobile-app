[CmdletBinding()]
param(
    [string] $OpenApiPath,
    [string] $TypeScriptPath
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $repoRoot 'scripts\initialize-msvc.ps1')
$openApi = if ($OpenApiPath) { $OpenApiPath } else { Join-Path $repoRoot 'contracts\openapi\openapi.json' }
$typescript = if ($TypeScriptPath) { $TypeScriptPath } else { Join-Path $repoRoot 'contracts\generated\api.ts' }
$webRoot = Join-Path $repoRoot 'apps\mobile\dist\vibeping-mobile\browser'
$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'

if (-not (Test-Path -LiteralPath $cargo -PathType Leaf)) {
    $cargo = (Get-Command cargo -ErrorAction Stop).Source
}

New-Item -ItemType Directory -Path $webRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path -Parent $openApi) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path -Parent $typescript) -Force | Out-Null

Push-Location $repoRoot
try {
    & $cargo run -p vibeping --bin export-openapi -- $openApi
    if ($LASTEXITCODE -ne 0) { throw 'OpenAPI generation failed.' }
    & pnpm exec openapi-typescript $openApi --output $typescript
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript contract generation failed.' }
}
finally {
    Pop-Location
}
