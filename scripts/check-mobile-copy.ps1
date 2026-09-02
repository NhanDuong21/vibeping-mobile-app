[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$forbidden = @(
    '\b(API|HTTP|SSE|SQLite|IndexedDB|VAPID|localhost|undefined|null)\b',
    'stack trace|Error:|127\.0\.0\.1|app-server|raw error',
    '\b(Loading|Retry|Save|Cancel|Settings|Activity|Computer|Diagnostics|Update|Offline|Online|Ready|Failed|Back|Next|Done)\b',
    'Legion 5'
)
$failures = [System.Collections.Generic.List[string]]::new()

Push-Location $repoRoot
try {
    $templates = @(& rg --files apps/mobile/src/app -g '*.html')
    foreach ($template in $templates) {
        $content = Get-Content -LiteralPath $template -Raw
        $surfaces = [System.Collections.Generic.List[string]]::new()

        foreach ($match in [regex]::Matches($content, '>([^<]+)<')) {
            $text = [regex]::Replace($match.Groups[1].Value, '\{\{[\s\S]*?\}\}', '')
            $text = [regex]::Replace($text, '@(?:if|else|for|switch|case)[\s\S]*', '')
            if (-not [string]::IsNullOrWhiteSpace($text)) { $surfaces.Add($text.Trim()) }
        }
        foreach ($match in [regex]::Matches($content, '\b(?:aria-label|placeholder|title|alt)\s*=\s*"([^"]*)"')) {
            $surfaces.Add($match.Groups[1].Value)
        }
        foreach ($expression in [regex]::Matches($content, '\{\{([\s\S]*?)\}\}')) {
            foreach ($literal in [regex]::Matches($expression.Groups[1].Value, '[''"]([^''"]+)[''"]')) {
                $surfaces.Add($literal.Groups[1].Value)
            }
        }

        foreach ($surface in $surfaces) {
            foreach ($pattern in $forbidden) {
                if ($surface -match $pattern) {
                    $failures.Add("Raw technical client copy in ${template}: $surface")
                }
            }
        }
    }
    if ($failures.Count -gt 0) {
        foreach ($failure in $failures) { Write-Error $failure -ErrorAction Continue }
        exit 1
    }
    Write-Host 'Vietnamese client-copy audit passed.'
}
finally {
    Pop-Location
}
