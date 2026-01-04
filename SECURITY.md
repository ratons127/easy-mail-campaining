Security notes

- SMTP account passwords are stored in plain text in the database (`smtp_accounts.password`). Use app-specific passwords and restrict DB access. For production, use encryption or a secret manager.
- `DEV_JWT_SECRET` is used to enable local JWT encoding. Do not use the dev secret in production.
- The bootstrap admin endpoint (`/api/auth/bootstrap`) should only be used when no users exist. Lock it down in production environments.
- Limit access to attachments storage (`APP_ATTACHMENTS_PATH`) and consider size limits and virus scanning for uploads.
- Keep Postgres and Mail server ports firewalled; do not expose them to the public internet.
