#!/bin/sh
# Generates a self-signed TLS certificate at container start-up if none is
# present, so `docker compose up` works on a fresh clone with no manual step.
set -e

CERT_DIR=/etc/nginx/certs

if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
  echo "TLS certificate already present"
  exit 0
fi

mkdir -p "$CERT_DIR"
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/C=FR/ST=IDF/L=Paris/O=FibreFlow/CN=${SERVER_NAME:-localhost}" \
  -addext "subjectAltName=DNS:${SERVER_NAME:-localhost},DNS:localhost,IP:127.0.0.1"

echo "Self-signed TLS certificate generated in $CERT_DIR"
