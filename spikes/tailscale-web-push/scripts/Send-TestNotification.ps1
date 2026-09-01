[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Gate0.Tools.ps1')
$binary = Join-Path $script:RepoRoot 'target\release\vibeping-gate0.exe'
if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) { throw 'Build or start Gate 0 first.' }
& $binary send
exit $LASTEXITCODE
