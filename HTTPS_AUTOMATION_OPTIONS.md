# HTTPS automation options

The dashboard currently runs on HTTP port `25901`.

Target:

```txt
https://YOUR_DOMAIN
  -> reverse proxy or tunnel
  -> http://127.0.0.1:25901
```

## Option A: Nginx + Certbot

Use this when the server supports root/sudo and public ports `80` and `443`.

```bash
sudo bash deploy/install-nginx-certbot.sh natsumidashboard.YOUR_DOMAIN 25901 your@email.com
```

This installs:

- nginx
- certbot
- python3-certbot-nginx

It also creates a reverse proxy and requests a free Let's Encrypt certificate.

## Option B: Cloudflare Tunnel

Use this when the server cannot expose ports `80` and `443`, but you can run a small daemon.

In Cloudflare Zero Trust:

1. Networks > Tunnels
2. Create tunnel
3. Choose cloudflared
4. Copy the tunnel token
5. Add public hostname:

```txt
Hostname: natsumidashboard.YOUR_DOMAIN
Service: http://localhost:25901
```

Then run on the server:

```bash
sudo bash deploy/install-cloudflared-tunnel.sh YOUR_TUNNEL_TOKEN
```

## Option C: Cloudflare Worker proxy

Use this when server installation is impossible.

Files:

```txt
cloudflare/worker.js
cloudflare/wrangler.toml.example
```

Set Worker variable:

```txt
ORIGIN_URL=http://45.13.236.245:25901
```

## Backend variables after HTTPS is ready

Set these to the public HTTPS domain:

```env
DASHBOARD_URL=https://natsumidashboard.YOUR_DOMAIN/
SITE_URL=https://natsumidashboard.YOUR_DOMAIN/
PUBLIC_BASE_URL=https://natsumidashboard.YOUR_DOMAIN
ALLOWED_ORIGINS=https://natsumidashboard.YOUR_DOMAIN
```

Discord OAuth redirect URI:

```txt
https://natsumidashboard.YOUR_DOMAIN/auth/callback
```
