[CmdletBinding()]
param([switch] $SkipBuild)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$version = '1.0.0-rc.4'
$packageName = "VibePing-Windows-x64-v$version"
$artifactRoot = Join-Path $repoRoot 'artifacts'
$packageDirectory = Join-Path $artifactRoot $packageName
$zipPath = Join-Path $artifactRoot "$packageName.zip"
$checksumPath = Join-Path $artifactRoot "$packageName.sha256"
$templateRoot = Join-Path $repoRoot 'release\windows'

function Assert-ArtifactTarget([string] $path) {
    $root = [IO.Path]::GetFullPath($artifactRoot).TrimEnd('\') + '\'
    $target = [IO.Path]::GetFullPath($path)
    if (-not $target.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Mục tiêu nằm ngoài artifacts: $target"
    }
}

if (-not $SkipBuild) {
    & (Join-Path $PSScriptRoot 'build-release.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Release build chưa hoàn tất.' }
}

New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
foreach ($target in @($packageDirectory, $zipPath, $checksumPath)) {
    Assert-ArtifactTarget $target
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}
New-Item -ItemType Directory -Path $packageDirectory | Out-Null

$binary = Join-Path $repoRoot 'target\release\vibeping.exe'
if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
    throw 'Chưa có vibeping.exe release để đóng gói.'
}
$files = @(
    @{ Source = $binary; Name = 'vibeping.exe' },
    @{ Source = (Join-Path $templateRoot 'Start VibePing.bat'); Name = 'Start VibePing.bat' },
    @{ Source = (Join-Path $templateRoot 'Stop VibePing.bat'); Name = 'Stop VibePing.bat' },
    @{ Source = (Join-Path $templateRoot 'Restart VibePing.bat'); Name = 'Restart VibePing.bat' },
    @{ Source = (Join-Path $templateRoot 'Open VibePing.bat'); Name = 'Open VibePing.bat' },
    @{ Source = (Join-Path $templateRoot 'Huong-dan.txt'); Name = 'Huong-dan.txt' }
)
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file.Source -PathType Leaf)) {
        throw "Thiếu tệp release: $($file.Source)"
    }
    Copy-Item -LiteralPath $file.Source -Destination (Join-Path $packageDirectory $file.Name)
}

$actual = @(Get-ChildItem -LiteralPath $packageDirectory -File | Select-Object -ExpandProperty Name)
$expected = @($files | ForEach-Object { $_.Name })
if ($actual.Count -ne $expected.Count -or @($expected | Where-Object { $_ -notin $actual }).Count) {
    throw 'Nội dung gói Windows không đúng danh sách cho phép.'
}

Compress-Archive -LiteralPath $packageDirectory -DestinationPath $zipPath -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($checksumPath, "$hash *$packageName.zip`r`n", [Text.Encoding]::ASCII)

Write-Host "Package: $packageDirectory"
Write-Host "ZIP: $zipPath"
Write-Host "SHA-256: $hash"
