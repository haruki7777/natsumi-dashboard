#!/usr/bin/env bash
set -euo pipefail

TUNNEL_TOKEN="${1:-${CLOUDFLARE_TUNNEL_TOKEN:-}}"

if [ -z "$TUNNEL_TOKEN" ]; then
  echo "Usage: sudo bash deploy/install-cloudflared-tunnel.sh <cloudflare_tunnel_token>"
  echo "Or set CLOUDFLARE_TUNNEL_TOKEN first."
  exit 1
fi

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root."
  exit 1
fi

ARCH="$(dpkg --print-architecture)"
case "$ARCH" in
  amd64) PKG_ARCH="amd64" ;;
  arm64) PKG_ARCH="arm64" ;;
  armhf) PKG_ARCH="armhf" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

TMP_DEB="/tmp/cloudflared-linux-${PKG_ARCH}.deb"
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${PKG_ARCH}.deb" -o "$TMP_DEB"
dpkg -i "$TMP_DEB" || apt-get install -f -y

cloudflared service install "$TUNNEL_TOKEN"
systemctl enable cloudflared
systemctl restart cloudflared
systemctl status cloudflared --no-pager || true

echo "Cloudflare Tunnel installed. Check the tunnel hostname in Cloudflare Zero Trust."
