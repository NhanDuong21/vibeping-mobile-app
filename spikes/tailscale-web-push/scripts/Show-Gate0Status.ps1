[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Gate0.Tools.ps1')
$tailscale = Resolve-Tailscale
$binary = Join-Path $script:RepoRoot 'target\release\vibeping-gate0.exe'

if (Test-Path -LiteralPath $script:RuntimeFile -PathType Leaf) {
    $runtime = Get-Content -LiteralPath $script:RuntimeFile -Raw | ConvertFrom-Json
    Write-Host "Process: running (PID $($runtime.pid))"
    Write-Host "Private: $($runtime.stableOrigin)"
    try { Test-PrivateHealth -Origin ([string]$runtime.stableOrigin); Write-Host 'Private health: ready' }
    catch { Write-Host 'Private health: unavailable' }
} else { Write-Host 'Process: stopped' }

$proxy = Get-RootProxy -Tailscale $tailscale
Write-Host "Tailscale Serve root: $(if ($proxy) { $proxy } else { 'not configured' })"
if (Test-Path -LiteralPath $binary -PathType Leaf) { & $binary status }
