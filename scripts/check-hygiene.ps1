[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $repoRoot
try {
    $failures = [System.Collections.Generic.List[string]]::new()
    $tracked = @(& git ls-files)
    if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate tracked files.' }
    $forbiddenTracked = $tracked | Where-Object {
        $_ -match '(^|/)\.runtime/' -or
        $_ -match '(^|/)(vapid[^/]*\.(json|key)|subscription\.json|.*\.pid|.*\.log)$' -or
        $_ -match 'tailscale-(before|after).*\.json$'
    }
    foreach ($path in $forbiddenTracked) {
        $failures.Add("Runtime or sensitive state is tracked: $path")
    }

    $scanFiles = @(& rg --files --hidden -g '!.git/**' -g '!.agents/**' -g '!node_modules/**' -g '!target/**' -g '!generated/**' -g '!Cargo.lock' -g '!pnpm-lock.yaml')
    if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate files for the hygiene scan.' }
    $patterns = @(
        '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
        'sk-(proj-)?[A-Za-z0-9_-]{20,}',
        'OPENAI_API_KEY\s*=',
        '\x22private(Key|_key)\x22\s*:\s*\x22[A-Za-z0-9_-]{20,}',
        'C:[/\\]Users[/\\][^/\\\s]+[/\\]'
    )
    foreach ($pattern in $patterns) {
        if ($scanFiles.Count -eq 0) { continue }
        $matches = @(& rg -n --no-heading --color never -e $pattern -- $scanFiles 2>$null)
        foreach ($match in $matches) { $failures.Add("Sensitive pattern: $match") }
    }

    $codexSources = @(& rg --files apps/desktop/src/features/codex_attention apps/desktop/src/features/usage_limits)
    if ($codexSources.Count -gt 0) {
        $credentialAccess = @(& rg -n --no-heading --color never -i -e 'auth\.json|credentials\.(json|toml)|credential[_-]?file' -- $codexSources 2>$null)
        foreach ($match in $credentialAccess) {
            $failures.Add("Codex credential-file access is forbidden: $match")
        }
    }

    if ($failures.Count -gt 0) {
        foreach ($failure in $failures) { Write-Error $failure -ErrorAction Continue }
        exit 1
    }
    Write-Host 'Repository hygiene check passed.'
}
finally {
    Pop-Location
}
