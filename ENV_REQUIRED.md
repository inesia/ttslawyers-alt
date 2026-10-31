# Blocking configuration for production CMS

Website is live at:
https://ttslawyers-alt.vercel.app/

Admin URL:
https://ttslawyers-alt.vercel.app/admin

## Current blocker

Production login currently returns:
`Missing environment variable: CMS_ADMIN_PASSWORD`

Set these in Vercel → Settings → Environment Variables, then Redeploy:

1. `CMS_ADMIN_PASSWORD` = your chosen admin password
2. `CMS_SESSION_SECRET` = long random secret
3. `GITHUB_TOKEN` = GitHub token with repo contents write on `inesia/ttslawyers-alt`
4. `GITHUB_OWNER` = `inesia`
5. `GITHUB_REPO` = `ttslawyers-alt`
6. `GITHUB_BRANCH` = `main`

After Redeploy, critical path becomes:

Login → Edit → Save Draft → Preview → Publish → GitHub commit → Vercel redeploy
