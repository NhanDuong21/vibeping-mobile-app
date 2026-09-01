[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("vibeping-contracts-" + [guid]::NewGuid().ToString('N'))
$expectedOpenApi = Join-Path $repoRoot 'contracts\openapi\openapi.json'
$expectedTypeScript = Join-Path $repoRoot 'contracts\generated\api.ts'
$actualOpenApi = Join-Path $temporaryRoot 'openapi.json'
$actualTypeScript = Join-Path $temporaryRoot 'api.ts'

function Get-Sha256([string]$Path) {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($Path)
    try {
        $bytes = $algorithm.ComputeHash($stream)
        return ([BitConverter]::ToString($bytes)).Replace('-', '')
    }
    finally {
        $stream.Dispose()
        $algorithm.Dispose()
    }
}

New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
try {
    & (Join-Path $PSScriptRoot 'generate.ps1') -OpenApiPath $actualOpenApi -TypeScriptPath $actualTypeScript
    if ((Get-Sha256 $expectedOpenApi) -ne (Get-Sha256 $actualOpenApi)) {
        throw 'The OpenAPI contract is stale. Run pnpm generate:contracts.'
    }
    if ((Get-Sha256 $expectedTypeScript) -ne (Get-Sha256 $actualTypeScript)) {
        throw 'The TypeScript contract is stale. Run pnpm generate:contracts.'
    }
    Write-Host 'Generated API contract is fresh.'
}
finally {
    $resolvedTemp = [IO.Path]::GetFullPath($temporaryRoot)
    $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
