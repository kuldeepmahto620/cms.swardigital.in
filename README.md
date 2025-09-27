# Swar Digital CMS - Frontend + PHP API

This repo contains a static SPA (HTML/CSS/JS) and a shared-hosting friendly PHP API. Deployable to cPanel via GitHub Actions (FTP).

## Structure
- `index.html` + `assets/` — SPA UI
- `api/` — PHP API (front controller + routes)
  - `index.php`, `bootstrap.php`, `routes/`, `.htaccess`
- `config/` — environment configuration
  - `env.sample.php` (template)
  - `env.php` (create on server only; not in git)
- `sql/001_init.sql` — initial MySQL schema (import via phpMyAdmin)
- `.github/workflows/deploy.yml` — CI deploy via FTP

## Local Development (static preview)
Open `index.html` in a browser. The SPA will call APIs under `/api/v1/*` if available.

## Server Setup (cPanel)
1. Create MySQL DB and user in cPanel. Grant all privileges.
2. Import `sql/001_init.sql` via phpMyAdmin.
3. Copy `config/env.sample.php` to `config/env.php` on the server and fill:
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `JWT_SECRET` (long random string)
   - `CORS_ORIGINS` (e.g. `https://cms.swardigital.in`)
4. Ensure `api/.htaccess` exists to route all `/api/*` requests to `api/index.php`.

## Deploy via GitHub Actions (FTP)
1. Create repo secrets in GitHub:
   - `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_ROOT` (e.g., `/public_html/cms/`)
2. The workflow `.github/workflows/deploy.yml` uploads on each push to `main`.
3. Ensure `config/env.php` exists on the server (not committed).

## Verify API
- `https://your-domain/api/` → API info
- `https://your-domain/api/v1/ping` → pong
- `https://your-domain/api/v1/db-check` → `{ ok: true }` if DB connects

## Useful Endpoints
- GET/POST `/api/v1/artists`
- GET/POST `/api/v1/labels`
- GET/POST `/api/v1/releases`
- GET/PUT/DELETE `/api/v1/releases/:id`

## Notes
- Do not commit `config/env.php` (gitignored).
- Adjust `api/.htaccess` `RewriteBase` if API folder is nested (e.g., `/cms/api/`).
