# No Cloudflare, no payment HTTPS setup

This is the clean free route without Cloudflare.

## Required conditions

You need all of these:

```txt
1. A real domain or subdomain you control
2. DNS A record points to the server IP
3. Server can open public 80/tcp and 443/tcp
4. Server has sudo/root access
5. Dashboard keeps running on internal port 25901
```

If any of these are missing, trusted public HTTPS cannot be issued directly on the server.

## DNS at Gabia or your DNS provider

Create or edit this record:

```txt
Type: A
Name: natsumidashboard
Value: 45.13.236.245
TTL: Auto
```

Do not include the port.

Wrong:

```txt
45.13.236.245:25901
```

Correct:

```txt
45.13.236.245
```

## Install HTTPS reverse proxy

Run this on the server:

```bash
sudo bash deploy/install-nginx-certbot.sh natsumidashboard.YOUR_DOMAIN 25901 your@email.com
```

Example:

```bash
sudo bash deploy/install-nginx-certbot.sh natsumidashboard.example.com 25901 necoharuki@icloud.com
```

This automatically installs:

```txt
nginx
certbot
python3-certbot-nginx
```

And configures:

```txt
https://natsumidashboard.YOUR_DOMAIN
  -> nginx 443
  -> http://127.0.0.1:25901
```

## Discord OAuth

Add this redirect URI in Discord Developer Portal:

```txt
https://natsumidashboard.YOUR_DOMAIN/auth/callback
```

Keep the old HTTP callback until the new HTTPS one is confirmed working.

## Dashboard environment variables

Set these after HTTPS is ready:

```env
DASHBOARD_URL=https://natsumidashboard.YOUR_DOMAIN/
SITE_URL=https://natsumidashboard.YOUR_DOMAIN/
PUBLIC_BASE_URL=https://natsumidashboard.YOUR_DOMAIN
ALLOWED_ORIGINS=https://natsumidashboard.YOUR_DOMAIN
COOKIE_SECURE=true
```

If testing through the old HTTP URL, set `COOKIE_SECURE=false` temporarily.

## If the server panel cannot run sudo

Then this method cannot work on that server. Use one of these instead:

```txt
1. A VPS with sudo/root access
2. Hosting provider built-in SSL/reverse proxy
3. A tunnel/proxy provider
```

There is no trusted browser HTTPS certificate that works publicly without either:

```txt
- control of domain validation, and
- a server/proxy that can answer HTTPS traffic
```
