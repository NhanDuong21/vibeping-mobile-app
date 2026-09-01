# Gate 0 — Tailscale Web Push

This isolated spike serves a Vietnamese diagnostic PWA from `127.0.0.1:8787`, persists one VAPID identity and the latest phone registration under `%LOCALAPPDATA%\VibePing\Gate0`, and sends encrypted standards-based Web Push. Tailscale Serve supplies the stable private HTTPS origin; Funnel is never used.

## Run

```powershell
.\spikes\tailscale-web-push\scripts\Start-Gate0.ps1
.\spikes\tailscale-web-push\scripts\Show-Gate0Status.ps1
.\spikes\tailscale-web-push\scripts\Send-TestNotification.ps1
.\spikes\tailscale-web-push\scripts\Restart-Gate0.ps1 -SkipBuild
.\spikes\tailscale-web-push\scripts\Stop-Gate0.ps1
```

Stop preserves Serve, VAPID, and phone state. Clean Up restores the exact Serve snapshot only when no later change is detected. It preserves push state unless `-DeletePushState` is supplied and the interactive `XOA` confirmation succeeds.

The physical iPhone result is authoritative. A provider acceptance or desktop notification is not a Gate 0 pass.
