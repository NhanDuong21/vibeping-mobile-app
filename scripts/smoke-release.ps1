[CmdletBinding()]
param(
    [string] $PackageZip,
    [int] $Port = 8793,
    [switch] $RequireRealAllowance
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packageName = 'VibePing-Windows-x64-v1.1.2'
if ([string]::IsNullOrWhiteSpace($PackageZip)) {
    $PackageZip = Join-Path $repoRoot "artifacts\$packageName.zip"
}
$PackageZip = [IO.Path]::GetFullPath($PackageZip)
if (-not (Test-Path -LiteralPath $PackageZip -PathType Leaf)) {
    throw "Không tìm thấy ZIP release: $PackageZip"
}

$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("VibePing package smoke with spaces " + [guid]::NewGuid())
$temporaryPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
$resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
if (-not $resolvedTemporary.StartsWith($temporaryPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Thư mục smoke không nằm trong thư mục tạm của Windows.'
}
$extractRoot = Join-Path $temporaryRoot 'clean extraction'
$dataDirectory = Join-Path $temporaryRoot 'runtime data with spaces'
$binary = Join-Path $extractRoot "$packageName\vibeping.exe"
$started = $false
$originalPath = $env:PATH

function Invoke-Executable([string[]] $arguments) {
    $output = (& $binary @arguments 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Lệnh VibePing chưa đạt: $output" }
    return $output
}

function Wait-Health {
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/health" -TimeoutSec 2
            if ($health.status -eq 'ok' -and $health.version -eq '1.1.2') { return $health }
        }
        catch { Start-Sleep -Milliseconds 300 }
    }
    throw 'Release package không đạt health trong thời gian chờ.'
}

function Test-PrivateHealth {
    $client = New-Object Net.Http.HttpClient
    try {
        $request = New-Object Net.Http.HttpRequestMessage([Net.Http.HttpMethod]::Get, "http://127.0.0.1:$Port/api/v1/health")
        $request.Headers.Host = 'smoke-device.example.ts.net'
        $response = $client.SendAsync($request).Result
        if (-not $response.IsSuccessStatusCode) { throw 'Private Host health không thành công.' }
        $hsts = @($response.Headers.GetValues('Strict-Transport-Security')) -join ''
        if ($hsts -ne 'max-age=31536000') { throw 'Private Host health thiếu HSTS.' }
    }
    finally {
        if ($null -ne $request) { $request.Dispose() }
        if ($null -ne $response) { $response.Dispose() }
        $client.Dispose()
    }
}

function Test-Sse {
    $client = New-Object Net.Http.HttpClient
    try {
        $response = $client.GetAsync(
            "http://127.0.0.1:$Port/api/v1/stream",
            [Net.Http.HttpCompletionOption]::ResponseHeadersRead
        ).Result
        if (-not $response.IsSuccessStatusCode) { throw 'SSE không trả về thành công.' }
        if ($response.Content.Headers.ContentType.MediaType -ne 'text/event-stream') {
            throw 'SSE không có content type đúng.'
        }
    }
    finally {
        if ($null -ne $response) { $response.Dispose() }
        $client.Dispose()
    }
}

function Wait-RealAllowance {
    $deadline = [DateTime]::UtcNow.AddSeconds(35)
    do {
        $snapshot = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/usage-limits" -TimeoutSec 4
        if ($snapshot.state -eq 'available' -and @($snapshot.windows).Count -gt 0) { return $snapshot }
        Start-Sleep -Seconds 1
    } while ([DateTime]::UtcNow -lt $deadline)
    if ($RequireRealAllowance) { throw 'Package chưa đọc được hạn mức Codex thật.' }
    return $snapshot
}

function Send-Fixture {
    $payload = '{"hook_event_name":"UserPromptSubmit","session_id":"phase10-smoke","turn_id":"one","cwd":"VibePing-Smoke"}'
    $fixturePath = Join-Path $temporaryRoot 'codex-fixture.json'
    [IO.File]::WriteAllBytes($fixturePath, [Text.Encoding]::UTF8.GetBytes($payload))
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = $env:ComSpec
    $fixtureCommand = "`"`"$binary`" integrations codex ingest-hook --source vibeping-hook-v1 --data-dir `"$dataDirectory`" < `"$fixturePath`"`""
    $startInfo.Arguments = "/d /s /c $fixtureCommand"
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $fixtureProcess = New-Object Diagnostics.Process
    $fixtureProcess.StartInfo = $startInfo
    [void]$fixtureProcess.Start()
    $fixtureProcess.WaitForExit()
    $output = $fixtureProcess.StandardOutput.ReadToEnd() + $fixtureProcess.StandardError.ReadToEnd()
    if ($fixtureProcess.ExitCode -ne 0) { throw "Codex fixture chưa được nhận: $output" }
    $fixtureProcess.Dispose()
    $deadline = [DateTime]::UtcNow.AddSeconds(8)
    do {
        $bootstrap = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/bootstrap" -TimeoutSec 3
        if ($bootstrap.currentWork.projectName -eq 'VibePing-Smoke') { return }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    throw 'Tín hiệu Codex fixture chưa xuất hiện trong current work.'
}

function Queue-FakeDelayedPush {
    $client = New-Object Net.Http.HttpClient
    try {
        $statusRequest = New-Object Net.Http.HttpRequestMessage([Net.Http.HttpMethod]::Get, "http://127.0.0.1:$Port/api/v1/pairing/status")
        $statusRequest.Headers.Host = 'smoke-device.example.ts.net'
        $statusRequest.Headers.Add('tailscale-user-login', 'smoke@example.test')
        $statusResponse = $client.SendAsync($statusRequest).Result
        $status = $statusResponse.Content.ReadAsStringAsync().Result | ConvertFrom-Json
        if ([string]::IsNullOrWhiteSpace([string]$status.csrfToken)) { throw 'Không nhận được CSRF smoke.' }

        $body = '{"installationId":"00000000-0000-4000-8000-000000000010"}'
        $request = New-Object Net.Http.HttpRequestMessage([Net.Http.HttpMethod]::Post, "http://127.0.0.1:$Port/api/v1/push/test")
        $request.Headers.Host = 'smoke-device.example.ts.net'
        $request.Headers.Referrer = 'https://smoke-device.example.ts.net/'
        $request.Headers.Add('Origin', 'https://smoke-device.example.ts.net')
        $request.Headers.Add('tailscale-user-login', 'smoke@example.test')
        $request.Headers.Add('x-vibeping-csrf', [string]$status.csrfToken)
        $request.Content = New-Object Net.Http.StringContent($body, [Text.Encoding]::UTF8, 'application/json')
        $response = $client.SendAsync($request).Result
        $result = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
        if (-not $response.IsSuccessStatusCode -or $result.queued -ne 1) {
            throw 'Thông báo trễ smoke chưa được xếp đúng một lần.'
        }
    }
    finally {
        foreach ($item in @($statusRequest, $statusResponse, $request, $response)) {
            if ($null -ne $item) { $item.Dispose() }
        }
        $client.Dispose()
    }
}

try {
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    Expand-Archive -LiteralPath $PackageZip -DestinationPath $extractRoot
    $required = @('vibeping.exe', 'vibeping-ready.exe', 'Bat San sang.bat', 'Tat San sang.bat', 'Start VibePing.bat', 'Stop VibePing.bat', 'Restart VibePing.bat', 'Open VibePing.bat', 'Huong-dan.txt')
    foreach ($name in $required) {
        if (-not (Test-Path -LiteralPath (Join-Path (Split-Path $binary) $name) -PathType Leaf)) {
            throw "Gói release thiếu $name"
        }
    }
    if (@(Get-ChildItem -LiteralPath (Split-Path $binary) -File).Count -ne $required.Count) {
        throw 'Gói release chứa tệp ngoài danh sách cho phép.'
    }
    foreach ($name in @('node.exe', 'pnpm.exe', 'cargo.exe', 'rustc.exe')) {
        if (Get-ChildItem -LiteralPath (Split-Path $binary) -Recurse -Filter $name) {
            throw "Gói release không được chứa $name"
        }
    }

    New-Item -ItemType Directory -Path (Join-Path $dataDirectory 'Gate0') -Force | Out-Null
    $fakeSubscription = [ordered]@{
        endpoint = 'https://push.invalid/vibeping-smoke'
        keys = [ordered]@{ p256dh = 'not-a-real-phone-key'; auth = 'not-a-real-auth' }
    } | ConvertTo-Json -Depth 3
    [IO.File]::WriteAllText(
        (Join-Path $dataDirectory 'Gate0\subscription.json'),
        $fakeSubscription,
        (New-Object Text.UTF8Encoding($false))
    )

    $env:PATH = "$env:SystemRoot\System32;$env:SystemRoot;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
    foreach ($developerTool in @('node', 'pnpm', 'cargo', 'rustc')) {
        if (Get-Command $developerTool -ErrorAction SilentlyContinue) {
            throw "Smoke vẫn thấy developer runtime: $developerTool"
        }
    }
    $version = Invoke-Executable @('--version')
    if ($version -ne 'vibeping 1.1.2') { throw "Sai phiên bản package: $version" }

    $start = Invoke-Executable @('start', '--port', [string]$Port, '--data-dir', $dataDirectory)
    $started = $true
    if ($start -notmatch 'VibePing đã sẵn sàng') { throw 'Start không trả về trạng thái sẵn sàng.' }
    if ((Invoke-Executable @('status', '--data-dir', $dataDirectory)) -notmatch 'VibePing đang chạy') {
        throw 'Status không xác nhận tiến trình đang chạy.'
    }
    Wait-Health | Out-Null
    Test-PrivateHealth

    $page = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/activity" -TimeoutSec 4
    if ($page.StatusCode -ne 200 -or $page.Content -notmatch '<app-root') { throw 'Browser shell không tải được.' }
    foreach ($asset in @('/manifest.webmanifest', '/ngsw-worker.js')) {
        if ((Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port$asset" -TimeoutSec 4).StatusCode -ne 200) {
            throw "PWA asset chưa tải được: $asset"
        }
    }
    $bootstrap = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/bootstrap" -TimeoutSec 4
    if ($bootstrap.connection.desktop -ne 'running') { throw 'REST bootstrap chưa xác nhận desktop running.' }
    Test-Sse
    Wait-RealAllowance | Out-Null
    Send-Fixture
    Queue-FakeDelayedPush

    Invoke-Executable @('stop', '--data-dir', $dataDirectory) | Out-Null
    $started = $false
    Invoke-Executable @('restart', '--port', [string]$Port, '--data-dir', $dataDirectory) | Out-Null
    $started = $true
    Wait-Health | Out-Null
    $persisted = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/bootstrap" -TimeoutSec 4
    if ($persisted.currentWork.projectName -ne 'VibePing-Smoke') {
        throw 'Current work không tồn tại sau restart.'
    }
    Invoke-Executable @('stop', '--data-dir', $dataDirectory) | Out-Null
    $started = $false
    Write-Host 'Package smoke passed: extraction, lifecycle, private health, PWA, REST, SSE, allowance, fixture, delayed queue, persistence, no developer runtime.'
}
finally {
    $env:PATH = $originalPath
    if ($started -and (Test-Path -LiteralPath $binary -PathType Leaf)) {
        try { & $binary stop --data-dir $dataDirectory | Out-Null } catch {}
    }
    if (Test-Path -LiteralPath $temporaryRoot) {
        for ($attempt = 0; $attempt -lt 10 -and (Test-Path -LiteralPath $temporaryRoot); $attempt++) {
            try { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction Stop }
            catch { Start-Sleep -Milliseconds 500 }
        }
        if (Test-Path -LiteralPath $temporaryRoot) {
            Write-Warning "Không dọn được thư mục smoke tạm: $temporaryRoot"
        }
    }
}
