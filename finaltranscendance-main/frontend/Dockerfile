# ---- Build stage ----
FROM node:20-bookworm AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Relative by default: the API is served by the same nginx (same origin),
# so the app works whatever the hostname used to reach it.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Runtime stage: static files served by nginx ----
FROM nginx:1.27-alpine

COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
