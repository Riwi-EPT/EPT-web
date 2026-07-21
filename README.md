# riwi-web

> 📚 Full docs (architecture, deploy, ops, roadmap):
> [EPT-docs](https://github.com/JTeban1/EPT-docs). This README covers local setup only.

Frontend SPA for the RIWI English Placement Test (React + Vite + Tailwind). Renders the Reading
and Writing exam, the results report, and the teacher/admin question-bank console. Fetches only
sanitized data from `riwi-api`; it never receives answer keys.

## Prerequisites
- Node.js 20+
- The shared contract is consumed from **GitHub Packages** as `"@jteban1/shared": "^0.2.0"` (no
  longer a `file:` sibling). Installing it requires auth: a GitHub token with `read:packages`
  exported as `NODE_AUTH_TOKEN` (the repo's `.npmrc` reads it). See `EPT-shared/README.md`.
- `riwi-api` running (default `http://localhost:3000`).

## Setup
```bash
npm install
npm run dev                # http://localhost:5173
```
In dev, Vite proxies `/api` and `/lti` to the API (`API_TARGET`, default `http://localhost:3000`),
so requests are same-origin and session cookies work without CORS friction.

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — type-check
- `npm test` — run the Vitest + Testing Library suite (jsdom); `npm run test:watch` to watch

## Production
Set `VITE_API_BASE_URL` to the API origin at build time. Serve `dist/` as static files. The API
must allow this SPA's origin via its `WEB_ORIGIN` CORS setting. Deploying to Vercel: see
[EPT-docs/deployment.md](https://github.com/JTeban1/EPT-docs/blob/main/deployment.md).
