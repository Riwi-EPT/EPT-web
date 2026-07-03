# syntax=docker/dockerfile:1
# EPT-web container (issue #15 / D2): build the Vite SPA, serve it as static files
# from nginx. VITE_API_BASE_URL is compiled into the bundle at BUILD time.

# ---- builder: Vite production build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# GitHub Packages auth for @jteban1/shared (needs read:packages):
#   docker build --build-arg NODE_AUTH_TOKEN="$NODE_AUTH_TOKEN" \
#     --build-arg VITE_API_BASE_URL="https://api.example.com" -t ept-web .
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN

# Baked into the bundle at build time (empty = same-origin / behind a proxy).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: nginx static host ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
