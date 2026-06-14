# Cloudflare Tunnel free HTTPS setup

This deployment uses Cloudflare Tunnel instead of binding ports `80` and `443`.
It is suitable for Pterodactyl/Vortexa containers where `nginx`, `systemctl`, or
host-level Caddy cannot be controlled.

## Dashboard tunnel

Create a separate tunnel for the dashboard container.

1. Cloudflare dashboard -> Zero Trust -> Networks -> Tunnels.
2. Create a tunnel named `natsumi-dashboard`.
3. Choose `cloudflared` connector.
4. Copy only the long tunnel token from the connector command.
5. Add this environment variable to the dashboard server:

```env
DASHBOARD_CLOUDFLARED_TUNNEL_TOKEN=your_dashboard_tunnel_token
USE_CLOUDFLARE_HTTPS=true
PUBLIC_SERVICE_SCHEME=https
DASHBOARD_URL=https://natsumidashboard.kro.kr/
GAME_URL=https://natsumi-game.kro.kr/
DISCORD_REDIRECT_URI=https://natsumidashboard.kro.kr/auth/discord/callback
```

6. Add public hostnames to the same tunnel:

| Public hostname | Service |
| --- | --- |
| `natsumidashboard.kro.kr` | `http://localhost:25901` |
| `api.natsumidashboard.kro.kr` | `http://localhost:25901` |

7. Restart the dashboard server.

The app downloads `cloudflared` automatically in the container and starts the
tunnel when `DASHBOARD_CLOUDFLARED_TUNNEL_TOKEN` is present. The token is never
printed by the app logs.

## Discord redirects

Use HTTPS URLs only:

```text
https://natsumidashboard.kro.kr/auth/discord/callback
https://natsumidashboard.kro.kr/auth/discord/dashboard/callback
```

## Health check

```bash
curl -I https://natsumidashboard.kro.kr
curl -L https://natsumidashboard.kro.kr | head
```

The response must be the dashboard HTML, not the Vortexa Cloud panel.
