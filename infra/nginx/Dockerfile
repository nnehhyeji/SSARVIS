# 1) Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# 2) Runtime stage
FROM nginxinc/nginx-unprivileged:stable-alpine

USER root
RUN apk update && apk upgrade --no-cache

COPY infra/nginx/conf.d/ /etc/nginx/conf.d/
COPY --from=builder /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]