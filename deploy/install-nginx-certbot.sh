#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
ORIGIN_PORT="${2:-25901}"
EMAIL="${3:-admin@$DOMAIN}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo bash deploy/install-nginx-certbot.sh <domain> [origin_port] [email]"
  echo "Example: sudo bash deploy/install-nginx-certbot.sh natsumidashboard.example.com 25901 you@example.com"
  exit 1
fi

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy/install-nginx-certbot.sh $DOMAIN $ORIGIN_PORT $EMAIL"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script supports Ubuntu/Debian apt-based servers."
  exit 1
fi

apt-get update
apt-get install -y nginx

cat > "/etc/nginx/sites-available/$DOMAIN" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:$ORIGIN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

systemctl reload nginx

echo "Done. Open: http://$DOMAIN"
