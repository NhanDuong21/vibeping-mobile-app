[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'run', 'stop', 'restart', 'status', 'doctor', 'open')]
    [string] $Command = 'status',
    [int] $Port = 8790,
    [string] $DataDir
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$binary = Join-Path $repoRoot 'target\release\vibeping.exe'
if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
    throw 'Chưa có bản VibePing release. Hãy chạy .\scripts\check.ps1 trước.'
}

$arguments = @($Command)
if ($Command -in @('start', 'run', 'restart')) {
    $arguments += @('--port', [string]$Port)
}
if (-not [string]::IsNullOrWhiteSpace($DataDir)) {
    $resolvedData = [IO.Path]::GetFullPath($DataDir)
    $arguments += @('--data-dir', $resolvedData)
}

& $binary @arguments
exit $LASTEXITCODE
