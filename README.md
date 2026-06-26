# riwi-web

Frontend SPA for the RIWI English Placement Test (React + Vite + Tailwind). Renders the Reading
and Writing exam, the results report, and the teacher/admin question-bank console. Fetches only
sanitized data from `riwi-api`; it never receives answer keys.

## Prerequisites
- Node.js 20+
- `riwi-shared` checked out as a sibling folder (`../riwi-shared`), built once. The dependency is
  `"@riwi/shared": "file:../riwi-shared"` until it is published to a private registry.
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

## Production
Set `VITE_API_BASE_URL` to the API origin at build time. Serve `dist/` as static files. The API
must allow this SPA's origin via its `WEB_ORIGIN` CORS setting.
