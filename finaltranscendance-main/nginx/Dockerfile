FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf
# Scripts in /docker-entrypoint.d/ are run by the official image before nginx starts.
COPY generate-certs.sh /docker-entrypoint.d/05-generate-certs.sh
RUN chmod +x /docker-entrypoint.d/05-generate-certs.sh
