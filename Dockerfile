# syntax=docker/dockerfile:1
# EPT-web container (issue #15 / D2): build the Vite SPA, serve it as static files
# from nginx. VITE_API_BASE_URL is compiled into the bundle at BUILD time.

# ---- builder: Vite production build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Build: docker build --build-arg VITE_API_BASE_URL="https://api.example.com" -t ept-web .

# Baked into the bundle at build time (empty = same-origin / behind a proxy).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json ./
# No package-lock.json on purpose: the committed lock is generated on Windows and
# npm then skips the Linux native optional deps (rollup/esbuild) the Vite build
# needs — npm bug npm/cli#4828. Installing without it resolves this platform's binaries.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime: nginx static host ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
