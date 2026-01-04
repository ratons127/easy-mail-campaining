Deployment

CI (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`
- Runs frontend build + backend tests on push/PR to `main`.

Manual deploy (Node script)
- Script: `scripts/deploy.js`
- Requires SSH access to the server.
- Env vars:
  - `SSH_HOST` (server hostname or IP)
  - `SSH_USER` (ssh user)
  - `SSH_KEY_PATH` (optional, path to private key)
  - `DEPLOY_PATH` (remote path to app)
  - `REPO_URL` (git repo URL)
  - `BRANCH` (e.g., `main`)

Example:
```
set SSH_HOST=your.server
set SSH_USER=ubuntu
set SSH_KEY_PATH=C:\path\to\id_rsa
set DEPLOY_PATH=/opt/easy-mail
set REPO_URL=https://github.com/ratons127/Bluk-Mails-System.git
set BRANCH=main
node scripts/deploy.js
```

Deploy service (Node API)
- Location: `deploy-service`
- Requires `DEPLOY_TOKEN` env var.
- Endpoints:
  - `POST /deploy` with header `x-deploy-token: <token>`
  - `GET /health`

Start:
```
cd deploy-service
npm install
set DEPLOY_TOKEN=your_token
set SSH_HOST=your.server
set SSH_USER=ubuntu
set SSH_KEY_PATH=C:\path\to\id_rsa
set DEPLOY_PATH=/opt/easy-mail
set REPO_URL=https://github.com/ratons127/Bluk-Mails-System.git
set BRANCH=main
npm start
```

Security notes
- Keep `DEPLOY_TOKEN` secret.
- Restrict network access to the deploy service.
- Prefer SSH keys over passwords.
