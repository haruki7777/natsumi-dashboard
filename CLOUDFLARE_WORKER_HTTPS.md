# Cloudflare Worker HTTPS proxy

Use this when you cannot install Caddy, Nginx, or Certbot on the server.

## What this does

```txt
https://YOUR_DOMAIN
  -> Cloudflare Worker
  -> http://45.13.236.245:25901
```

The Node dashboard can keep running on port `25901`.

## Files

```txt
cloudflare/worker.js
cloudflare/wrangler.toml.example
```

## Worker environment variable

Set this variable in the Worker settings:

```txt
ORIGIN_URL=http://45.13.236.245:25901
```

## Cloudflare dashboard setup

1. Go to Cloudflare.
2. Open Workers & Pages.
3. Create Worker.
4. Paste `cloudflare/worker.js` into the Worker editor.
5. Save and deploy.
6. Add environment variable `ORIGIN_URL`.
7. Add a route or custom domain for the Worker.

Example route:

```txt
natsumidashboard.YOUR_DOMAIN/*
```

## Backend environment variables

Set dashboard public URLs to the HTTPS domain:

```env
DASHBOARD_URL=https://natsumidashboard.YOUR_DOMAIN/
SITE_URL=https://natsumidashboard.YOUR_DOMAIN/
PUBLIC_BASE_URL=https://natsumidashboard.YOUR_DOMAIN
ALLOWED_ORIGINS=https://natsumidashboard.YOUR_DOMAIN
```

Also update Discord OAuth redirect URI:

```txt
https://natsumidashboard.YOUR_DOMAIN/auth/callback
```

## Notes

- This is a workaround for servers where installing a reverse proxy is impossible.
- If you later can install Caddy, prefer Caddy + Let's Encrypt for a cleaner origin setup.
- Keep the original HTTP URL private if possible.
