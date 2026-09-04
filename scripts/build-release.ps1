[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'initialize-msvc.ps1')
$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
if (-not (Test-Path -LiteralPath $cargo -PathType Leaf)) {
    $cargo = (Get-Command cargo -ErrorAction Stop).Source
}

function Assert-LastCommand([string] $step) {
    if ($LASTEXITCODE -ne 0) { throw "$step chưa hoàn tất." }
}

Push-Location $repoRoot
try {
    & pnpm run generate:contracts
    Assert-LastCommand 'Tạo hợp đồng API'
    & pnpm run build:mobile
    Assert-LastCommand 'Build Angular production'
    & pnpm run check:contracts
    Assert-LastCommand 'Kiểm tra hợp đồng API'
    & $cargo build -p vibeping --release
    Assert-LastCommand 'Build VibePing Windows x64'

    $binary = Join-Path $repoRoot 'target\release\vibeping.exe'
    if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
        throw 'Không tìm thấy vibeping.exe sau build.'
    }
    $version = (& $binary --version | Out-String).Trim()
    Assert-LastCommand 'Đọc phiên bản VibePing'
    if ($version -ne 'vibeping 1.2.0') {
        throw "Phiên bản release không đúng: $version"
    }
    Write-Host "Release build sẵn sàng: $version"
}
finally {
    Pop-Location
}
