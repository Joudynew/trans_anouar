#!/usr/bin/env bash
# Génère un certificat auto-signé pour le développement / l'évaluation locale.
# À exécuter une seule fois : ./nginx/generate-certs.sh
set -e

mkdir -p nginx/certs

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/C=FR/ST=IDF/L=Paris/O=FibreFlow/CN=localhost"

echo "Certificats générés dans nginx/certs/"
