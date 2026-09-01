[CmdletBinding()]
param([switch] $DeletePushState)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Gate0.Tools.ps1')
& (Join-Path $PSScriptRoot 'Stop-Gate0.ps1') -Quiet
$tailscale = Resolve-Tailscale

if (Test-Path -LiteralPath $script:ChangeFile -PathType Leaf) {
    $change = Get-Content -LiteralPath $script:ChangeFile -Raw | ConvertFrom-Json
    $currentConfig = Join-Path $script:RuntimeDirectory 'tailscale-current.json'
    Save-TailscaleServeStatus -Tailscale $tailscale -Path $currentConfig
    $currentHash = Get-FileHashValue $currentConfig
    if ($currentHash -ne [string]$change.afterHash) {
        throw 'Tailscale Serve changed after Gate 0 configured it. Refusing to overwrite newer or unrelated mappings.'
    }
    $beforeStatus = (Get-Content -LiteralPath $script:BeforeConfig -Raw).Trim()
    if ($beforeStatus -ne '{}') {
        throw 'The saved pre-Gate 0 configuration is not empty. Refusing a broad reset.'
    }
    & $tailscale serve reset
    if ($LASTEXITCODE -ne 0 -or (Get-TailscaleServeStatusText -Tailscale $tailscale) -ne '{}') {
        throw 'Could not restore the empty Tailscale Serve configuration captured before Gate 0.'
    }
    foreach ($path in @($script:ChangeFile, $script:BeforeConfig, $script:AfterConfig, $currentConfig)) {
        if (Test-Path -LiteralPath $path -PathType Leaf) { Remove-Item -LiteralPath $path -Force }
    }
    Write-Host 'Restored the Tailscale Serve configuration captured before Gate 0.'
}

if ($DeletePushState) {
    $confirmation = Read-Host 'Type XOA to delete the VAPID identity and phone registration'
    if ($confirmation -ne 'XOA') { Write-Host 'Push state was preserved.'; return }
    $dataDirectory = Join-Path $env:LOCALAPPDATA 'VibePing\Gate0'
    foreach ($name in @('vapid.json', 'subscription.json')) {
        $path = Join-Path $dataDirectory $name
        if (Test-Path -LiteralPath $path -PathType Leaf) { Remove-Item -LiteralPath $path -Force }
    }
    Write-Host 'Deleted the sender identity and phone registration. Reinstalling or re-enabling notifications may be required.'
} else {
    Write-Host 'Sender identity and phone registration were preserved.'
}
