# Caddy HTTPS reverse proxy

Use this when the dashboard and game center are already running on exposed HTTP ports and one public server can receive ports 80 and 443.

1. Point DNS A records to the Caddy server IP.
   - `natsumidashboard.kro.kr`
   - `api.natsumidashboard.kro.kr`
   - `natsumi-game.kro.kr`
   - `api.natsumi-game.kro.kr`
2. Install Caddy on the public server.
3. Copy `deploy/Caddyfile` to Caddy's config path.
4. Reload Caddy.

Discord Developer Portal redirect URIs:

- `https://natsumidashboard.kro.kr/auth/discord/callback`
- `https://natsumidashboard.kro.kr/auth/discord/dashboard/callback`
- `https://natsumi-game.kro.kr/auth/discord/callback`
- `https://natsumi-game.kro.kr/auth/discord/game/callback`

The apps must use these environment values:

```env
DASHBOARD_URL=https://natsumidashboard.kro.kr/
GAME_URL=https://natsumi-game.kro.kr/
SITE_URL=https://natsumi-site.kro.kr/
PUBLIC_BASE_URL=https://natsumidashboard.kro.kr
ALLOWED_ORIGINS=https://natsumidashboard.kro.kr,https://natsumi-game.kro.kr,https://natsumi-site.kro.kr
```

Do not enable app-level `FORCE_HTTPS=true` until Caddy is actually serving a valid certificate on ports 80 and 443. Caddy should be the layer that redirects HTTP to HTTPS.
