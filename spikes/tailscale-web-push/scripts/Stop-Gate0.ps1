[CmdletBinding()]
param([switch] $Quiet)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Gate0.Tools.ps1')
if (-not (Test-Path -LiteralPath $script:RuntimeFile -PathType Leaf)) {
    if (-not $Quiet) { Write-Host 'Gate 0 is already stopped.' }
    return
}

$metadata = Get-Content -LiteralPath $script:RuntimeFile -Raw | ConvertFrom-Json
$process = Get-Process -Id ([int]$metadata.pid) -ErrorAction SilentlyContinue
if ($null -ne $process) {
    $actualPath = [IO.Path]::GetFullPath($process.Path)
    $expectedPath = [IO.Path]::GetFullPath([string]$metadata.path)
    if (-not $actualPath.Equals($expectedPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw "PID $($process.Id) belongs to another executable. Refusing to stop it."
    }
    $actualStart = $process.StartTime.ToUniversalTime()
    $expectedStart = ([DateTime]$metadata.startedAt).ToUniversalTime()
    if ([Math]::Abs(($actualStart - $expectedStart).TotalSeconds) -gt 2) {
        throw "PID $($process.Id) start time changed. Refusing to stop it."
    }

    Set-Content -LiteralPath $script:StopFile -Value 'stop' -Encoding ascii
    try {
        Wait-Process -Id $process.Id -Timeout 12 -ErrorAction Stop
    } catch {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        if (-not $Quiet) { Write-Warning 'Graceful stop timed out; the verified Gate 0 process was force-stopped.' }
    }
}

foreach ($path in @($script:RuntimeFile, $script:StopFile)) {
    if (Test-Path -LiteralPath $path -PathType Leaf) { Remove-Item -LiteralPath $path -Force }
}
if (-not $Quiet) { Write-Host 'Gate 0 stopped. Tailscale Serve and phone identity were preserved.' }
