# Deploy — EPT-web (Vercel)

**Status: LIVE** — <https://ept-web-eight.vercel.app> (Vercel, Vite static build,
auto-deploys on push to `main`). [`vercel.json`](./vercel.json) pins the build + SPA rewrites.

## One-time setup

1. Vercel: **Add New → Project**, import this repo (auto-detects Vite).
2. Set env vars (Project → Settings → Environment Variables):
   - `NODE_AUTH_TOKEN` — GitHub PAT with `read:packages` (installs `@jteban1/shared` at build).
   - `VITE_API_BASE_URL` — the Render API origin (e.g. `https://ept-api-q6gr.onrender.com`).
     **Baked into the bundle at build time**, so changing it requires a **redeploy**.
3. Deploy → copy the Vercel URL.

## Cross-origin wiring (the #1 gotcha)

SPA and API are separate origins, so both sides must point at each other:

- **web** `VITE_API_BASE_URL` → the Render API origin.
- **api** `WEB_ORIGIN` → this Vercel origin (scheme + host, no trailing slash).

A CORS error like `Access-Control-Allow-Origin: http://localhost:5173` means the API's
`WEB_ORIGIN` still has its default — set it to the Vercel URL and redeploy the API.
Note Vercel's per-deploy **preview** URLs are different subdomains and are *not* in the
API allow-list — demo from the **production** domain.

## Notes / gotchas

- **`npm install` (lock dropped), not `npm ci`.** The committed `package-lock.json` is
  generated on Windows; `npm ci` on Linux then skips the Linux native optional deps
  (rollup/esbuild) the Vite build needs — npm bug
  [npm/cli#4828](https://github.com/npm/cli/issues/4828). `vercel.json`'s `installCommand`
  removes the lock before installing so Linux binaries resolve. (CI does the same.)
- The Docker image + `nginx.conf` here are for the local `docker compose` stack; Vercel
  doesn't use them (it handles gzip/caching itself).
- CI (lint/build/test) runs via `.github/workflows/ci.yml` on every push/PR.
