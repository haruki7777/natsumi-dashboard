# HTTPS setup for Natsumi Dashboard

This project can use Caddy as a free HTTPS reverse proxy.

## Goal

- Node dashboard keeps running on internal port `25901`.
- Caddy listens on public ports `80` and `443`.
- Caddy forwards HTTPS traffic to `127.0.0.1:25901`.
- Caddy obtains and renews TLS certificates automatically.

## Caddyfile

Use this Caddyfile on the server:

```caddyfile
natsumidashboard.kro.kr {
    encode zstd gzip
    reverse_proxy 127.0.0.1:25901
}
```

## Required DNS

The domain must point to the server IP.

```txt
A     natsumidashboard.kro.kr     YOUR_SERVER_IPV4
AAAA  natsumidashboard.kro.kr     YOUR_SERVER_IPV6 optional
```

## Required ports

Open these public ports on the server or hosting panel:

```txt
80/tcp
443/tcp
```

The dashboard app port can stay internal:

```txt
25901/tcp
```

## Ubuntu install example

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Then put the Caddyfile here:

```bash
sudo nano /etc/caddy/Caddyfile
```

Check and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Check

Open:

```txt
https://natsumidashboard.kro.kr
```

If it does not work, check:

```bash
sudo systemctl status caddy --no-pager
sudo journalctl -u caddy -n 80 --no-pager
```
