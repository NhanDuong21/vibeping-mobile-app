[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& (Join-Path $repoRoot 'tools\architecture-check\check.ps1') -Root $repoRoot
exit $LASTEXITCODE
