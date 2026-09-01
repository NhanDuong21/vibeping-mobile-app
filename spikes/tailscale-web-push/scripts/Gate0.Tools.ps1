$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$script:SpikeRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script:RuntimeDirectory = Join-Path $script:RepoRoot '.runtime\gate0'
$script:RuntimeFile = Join-Path $script:RuntimeDirectory 'runtime.json'
$script:StopFile = Join-Path $script:RuntimeDirectory 'stop.signal'
$script:BeforeConfig = Join-Path $script:RuntimeDirectory 'tailscale-before.json'
$script:AfterConfig = Join-Path $script:RuntimeDirectory 'tailscale-after.json'
$script:ChangeFile = Join-Path $script:RuntimeDirectory 'tailscale-change.json'
$script:LocalHealth = 'http://127.0.0.1:8787/api/health'

function Resolve-Gate0Tool {
    param([Parameter(Mandatory)] [string] $Name, [string[]] $FallbackPaths = @())
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }
    foreach ($candidate in $FallbackPaths) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
    }
    throw "$Name was not found. See the Gate 0 README prerequisites."
}

function Resolve-Tailscale {
    Resolve-Gate0Tool -Name 'tailscale' -FallbackPaths @(
        (Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Tailscale\tailscale.exe')
    )
}

function Get-StableOrigin {
    param([Parameter(Mandatory)] [string] $Tailscale)
    $status = (& $Tailscale status --json | ConvertFrom-Json)
    $dnsName = [string]$status.Self.DNSName
    if ([string]::IsNullOrWhiteSpace($dnsName)) { throw 'Tailscale did not report a stable DNS name.' }
    'https://' + $dnsName.TrimEnd('.')
}

function Get-RootProxy {
    param([Parameter(Mandatory)] [string] $Tailscale)
    $raw = (& $Tailscale serve status --json) -join "`n"
    if ([string]::IsNullOrWhiteSpace($raw) -or $raw.Trim() -eq '{}') { return $null }
    $status = $raw | ConvertFrom-Json -AsHashtable
    if (-not $status.ContainsKey('Web')) { return $null }
    foreach ($web in $status['Web'].Values) {
        if ($web.ContainsKey('Handlers') -and $web['Handlers'].ContainsKey('/')) {
            return [string]$web['Handlers']['/']['Proxy']
        }
    }
    return $null
}

function Get-TailscaleServeStatusText {
    param([Parameter(Mandatory)] [string] $Tailscale)
    $content = (& $Tailscale serve status --json) -join "`n"
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($content)) {
        throw 'Could not read the current Tailscale Serve configuration.'
    }
    return $content.Trim()
}

function Save-TailscaleServeStatus {
    param([Parameter(Mandatory)] [string] $Tailscale, [Parameter(Mandatory)] [string] $Path)
    $content = Get-TailscaleServeStatusText -Tailscale $Tailscale
    Set-Content -LiteralPath $Path -Value $content -Encoding utf8NoBOM
}

function Assert-FunnelInactive {
    param([Parameter(Mandatory)] [string] $Tailscale)
    $status = ((& $Tailscale funnel status) -join "`n").Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Could not verify Tailscale Funnel status.' }
    if ($status -match '\(Funnel on\)' -or $status -match 'Available on the internet') {
        throw 'An existing Tailscale Funnel configuration is active. Gate 0 cannot prove private-only exposure.'
    }
}

function Get-FileHashValue {
    param([Parameter(Mandatory)] [string] $Path)
    (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Wait-Gate0Health {
    param([Parameter(Mandatory)] [System.Diagnostics.Process] $Process)
    $deadline = [DateTime]::UtcNow.AddSeconds(40)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($Process.HasExited) { throw 'Gate 0 stopped before becoming healthy.' }
        try {
            $health = Invoke-RestMethod -Uri $script:LocalHealth -TimeoutSec 2
            $Process.Refresh()
            if (-not $Process.HasExited -and $health.status -eq 'ok' -and $health.service -eq 'vibeping-gate0') { return }
        } catch { Start-Sleep -Milliseconds 400 }
    }
    throw 'Gate 0 did not become healthy within 40 seconds.'
}

function Test-PrivateHealth {
    param([Parameter(Mandatory)] [string] $Origin)
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $health = Invoke-RestMethod -Uri "$Origin/api/health" -TimeoutSec 8 -NoProxy
            if ($health.status -eq 'ok' -and $health.service -eq 'vibeping-gate0') { return }
        } catch { Start-Sleep -Milliseconds 750 }
    }
    throw "Private health check failed at $Origin"
}
