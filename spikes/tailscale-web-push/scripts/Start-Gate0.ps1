[CmdletBinding()]
param([switch] $SkipBuild)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
. (Join-Path $PSScriptRoot 'Gate0.Tools.ps1')
. (Join-Path $script:RepoRoot 'scripts\initialize-msvc.ps1')

New-Item -ItemType Directory -Path $script:RuntimeDirectory -Force | Out-Null
if (Test-Path -LiteralPath $script:RuntimeFile -PathType Leaf) {
    & (Join-Path $PSScriptRoot 'Stop-Gate0.ps1') -Quiet
}
foreach ($path in @($script:StopFile, (Join-Path $script:RuntimeDirectory 'server.stdout.log'), (Join-Path $script:RuntimeDirectory 'server.stderr.log'))) {
    if (Test-Path -LiteralPath $path -PathType Leaf) { Remove-Item -LiteralPath $path -Force }
}

$cargo = Resolve-Gate0Tool -Name 'cargo' -FallbackPaths @((Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'))
$tailscale = Resolve-Tailscale
$binary = Join-Path $script:RepoRoot 'target\release\vibeping-gate0.exe'
$serverOut = Join-Path $script:RuntimeDirectory 'server.stdout.log'
$serverErr = Join-Path $script:RuntimeDirectory 'server.stderr.log'
$target = 'http://127.0.0.1:8787'

Push-Location $script:RepoRoot
try {
    if (-not $SkipBuild) {
        & pnpm run build:gate0
        if ($LASTEXITCODE -ne 0) { throw 'Tailwind build failed.' }
        & $cargo build -p vibeping-gate0 --release
        if ($LASTEXITCODE -ne 0) { throw 'Gate 0 release build failed.' }
    }
} finally { Pop-Location }

if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) { throw "Gate 0 binary not found: $binary" }
$server = Start-Process -FilePath $binary -ArgumentList @('serve', '--stop-file', $script:StopFile) `
    -WorkingDirectory $script:RepoRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr

try {
    Wait-Gate0Health -Process $server
    $metadata = [ordered]@{
        startedAt = $server.StartTime.ToUniversalTime().ToString('o')
        pid = $server.Id
        path = $binary
        localUrl = 'http://127.0.0.1:8787'
        stableOrigin = $null
    }
    $metadata | ConvertTo-Json | Set-Content -LiteralPath $script:RuntimeFile -Encoding utf8NoBOM

    Assert-FunnelInactive -Tailscale $tailscale

    $rootProxy = Get-RootProxy -Tailscale $tailscale
    if ($rootProxy -and $rootProxy.TrimEnd('/') -ne $target) {
        throw "Tailscale Serve root is already used by '$rootProxy'. No configuration was changed."
    }
    if (-not $rootProxy) {
        if (-not (Test-Path -LiteralPath $script:ChangeFile -PathType Leaf)) {
            $beforeStatus = Get-TailscaleServeStatusText -Tailscale $tailscale
            if ($beforeStatus -ne '{}') {
                throw 'An existing Tailscale Serve configuration is present. No configuration was changed.'
            }
            Save-TailscaleServeStatus -Tailscale $tailscale -Path $script:BeforeConfig
            & $tailscale serve --bg --yes $target
            if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve could not configure private HTTPS.' }
            Save-TailscaleServeStatus -Tailscale $tailscale -Path $script:AfterConfig
            [ordered]@{
                target = $target
                beforeHash = Get-FileHashValue $script:BeforeConfig
                afterHash = Get-FileHashValue $script:AfterConfig
                configuredAt = [DateTime]::UtcNow.ToString('o')
            } | ConvertTo-Json | Set-Content -LiteralPath $script:ChangeFile -Encoding utf8NoBOM
        } else {
            throw 'Gate 0 expected its preserved Serve mapping, but the root route is missing. Run Clean Up Gate 0 before starting again.'
        }
    }

    $origin = Get-StableOrigin -Tailscale $tailscale
    Test-PrivateHealth -Origin $origin
    $metadata.stableOrigin = $origin
    $metadata | ConvertTo-Json | Set-Content -LiteralPath $script:RuntimeFile -Encoding utf8NoBOM

    Write-Host ''
    Write-Host 'VibePing Gate 0 is ready' -ForegroundColor Green
    Write-Host '────────────────────────'
    Write-Host "Local:   http://127.0.0.1:8787"
    Write-Host "Private: $origin" -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'The server remains running for the physical iPhone test.'
} catch {
    if (-not $server.HasExited) {
        Set-Content -LiteralPath $script:StopFile -Value 'stop' -Encoding ascii
        try { Wait-Process -Id $server.Id -Timeout 8 -ErrorAction Stop } catch { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path -LiteralPath $script:RuntimeFile) { Remove-Item -LiteralPath $script:RuntimeFile -Force }
    throw
}
