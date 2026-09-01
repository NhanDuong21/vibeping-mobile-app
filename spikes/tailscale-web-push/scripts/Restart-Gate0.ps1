[CmdletBinding()]
param([switch] $SkipBuild)

$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'Stop-Gate0.ps1') -Quiet
& (Join-Path $PSScriptRoot 'Start-Gate0.ps1') -SkipBuild:$SkipBuild
