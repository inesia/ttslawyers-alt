# TTS Law Firm CMS Setup

Lightweight Git-based CMS for editing Indonesian and English site content without changing the approved design.

## What was added

- `/content/{id|en}/*.json` — published editable content extracted from the live HTML
- `/drafts/` — created automatically in GitHub when drafts are saved
- `/admin` — Indonesian admin dashboard
- `/api/auth/*` — password login, logout, session check
- `/api/content*` — read, save draft, publish, status
- `assets/content.js` — hydrates existing pages from JSON
- `vercel.json` — admin rewrite + cache headers

## Vercel environment variables (REQUIRED for production admin)

Production site: `https://ttslawyers-alt.vercel.app/`  
Admin: `https://ttslawyers-alt.vercel.app/admin`

In Vercel → Project → Settings → Environment Variables, set **all** of these for Production (and Preview if needed), then **Redeploy**:

| Name | Required value / notes |
|---|---|
| `CMS_ADMIN_PASSWORD` | The admin login password chosen by the firm |
| `CMS_SESSION_SECRET` | A long random string, different from the password |
| `GITHUB_TOKEN` | GitHub PAT with Contents read/write on `inesia/ttslawyers-alt` |
| `GITHUB_OWNER` | `inesia` |
| `GITHUB_REPO` | `ttslawyers-alt` |
| `GITHUB_BRANCH` | `main` |

Without these, the public website still works, but `/admin` login / Save Draft / Publish will fail.

Never put these values in frontend JS or public JSON.

## GitHub token permissions

Use a fine-grained or classic token that can:

- Read repository contents
- Write repository contents on `main`

Recommended commit messages from the CMS:

- `cms(draft): save id/about.json`
- `cms(publish): update id/about.json`

## Deploy flow

1. Push this project to GitHub (already connected to Vercel).
2. Set the environment variables above.
3. Redeploy.
4. Open `https://YOUR-DOMAIN/admin`
5. Login with `CMS_ADMIN_PASSWORD`
6. Edit a page → **Simpan Draft**
7. Open **Preview** (`?preview=1`) to review draft content
8. Click **Publish**
9. Wait for Vercel to redeploy from the GitHub commit

Success copy after publish:

> Published to GitHub — Vercel deployment in progress

Do not assume the live site is updated until the Vercel deployment finishes.

## Local development

Do **not** use `python -m http.server` for admin login. That server cannot run `/api/*`.

1. Copy `.env.example` to `.env`
2. Set at least `CMS_ADMIN_PASSWORD` and `CMS_SESSION_SECRET`
3. Start the local CMS server:

```bash
node server.js
```

4. Open `http://127.0.0.1:8765/admin/`

- Public pages still load `/content/...json` directly.
- Draft/publish still need a valid `GITHUB_TOKEN` (or use the deployed Vercel environment).

## Content map

| Admin menu | JSON | Rendered on |
|---|---|---|
| Beranda | `home.json` | `index.html` / `en-index.html` |
| Tentang Kami | `about.json` | `firma-hukum.html` / `en-firma-hukum.html` |
| Visi | `vision.json` | same About page (`#visi`) |
| Pendiri | `founder.json` | `pendiri.html` / `en-pendiri.html` |
| Bidang Praktik | `practice-areas.json` | Expertise `#jasa` |
| Rekam Jejak | `track-record.json` | Expertise `#pengalaman` |
| Tim | `team.json` | `partners.html` / `en-partners.html` |
| Kontak | `contact.json` | `kontak.html` / `en-kontak.html` |

Indonesian and English are independently editable.

## Safety rules for editors

- Edit wording carefully; legal terms must stay exact unless intentionally changed by the firm.
- Prefer plain textareas; do not paste HTML.
- Do not edit CSS/JS/layout through the CMS.
- Image fields accept existing asset paths such as `assets/slide-2-image-5.jpg`.

## Re-extract content from HTML

If HTML is restored from an older source and JSON must be rebuilt:

```bash
python tools/extract_content.py
```

This overwrites `/content` from the current HTML files.
