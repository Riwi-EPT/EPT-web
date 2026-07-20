# Deploy — EPT-web (Vercel)

The SPA is a static Vite build → Vercel serves it on its CDN and auto-deploys on
push to `main`. [`vercel.json`](./vercel.json) pins the Vite build + SPA rewrites.

## One-time setup

1. In Vercel: **Add New → Project**, import this repo (framework auto-detects as Vite).
2. Set env vars (Project → Settings → Environment Variables):
   - `NODE_AUTH_TOKEN` — GitHub PAT with `read:packages` (installs `@jteban1/shared`
     at build). Scope it to the **Build** step.
   - `VITE_API_BASE_URL` — the Render API URL, e.g. `https://ept-api.onrender.com`
     (baked into the bundle at build time).
3. Deploy. Every push to `main` (and every PR, as a preview) redeploys automatically.

## Cross-origin wiring (important)

The SPA and API are on different origins, so:

- **web** `VITE_API_BASE_URL` → the Render API URL.
- **api** `WEB_ORIGIN` → this Vercel URL (the API's CORS allow-list).

If a request is blocked by CORS or the exam won't load, these two are almost always
the mismatch. Update the value and redeploy the affected side.

## Notes

- The Docker image + `nginx.conf` in this repo are for the local `docker compose`
  stack; Vercel does not use them (it handles gzip/caching itself).
- CI (lint/build/test) runs via `.github/workflows/ci.yml` on every push/PR.
