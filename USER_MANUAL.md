User manual

Overview
- This app manages bulk email campaigns with approvals, audiences, and SMTP settings.
- Roles: SUPER_ADMIN, HR_ADMIN, DEPT_ADMIN, SENDER, APPROVER, AUDITOR.
- There are two SMTP uses:
  - Notification SMTP: login/reset and system emails (set in Settings -> Policies).
  - Campaign SMTP: used by campaigns (set per campaign).

Prerequisites
- Backend running and reachable at `http://<server>:8081`
- Frontend running and reachable at `http://<server>:8080`
- Database is healthy and migrations are applied.

Admin quick-start (Docker + first login)
1) Copy `.env.example` to `.env` and set values as needed.
2) Start the stack:
   - `docker compose up -d --build`
3) Open the UI at `http://<server>:8080`.
4) Click "First-time admin setup".
5) Create the first SUPER_ADMIN and sign in.
Notes
- The bootstrap only works when no users exist in the database.
- To allow bootstrap again, wipe the database or remove all users.

Login and first admin
1) Open `http://<server>:8080`
2) Click "First-time admin setup" to create the first SUPER_ADMIN.
   - This only works when there are no users in the database.
3) Sign in with email and password.

Navigation overview
- Settings: SMTP accounts, Sender identities, Policies (notification SMTP), User access.
- Audiences: recipient filters and previews.
- Campaigns: create, approve, send, resend, re-queue.
- Reports: Delivery summary, Recipient log.

Settings (SUPER_ADMIN / HR_ADMIN)
SMTP accounts
1) Go to Settings -> SMTP accounts.
2) Add an SMTP account (Gmail, AWS SES, or private SMTP).
3) Save.
Notes
- Deleting a SMTP account fails if it is used by notifications, sender identities, or campaigns.

Sender identities
1) Go to Settings -> Sender identities.
2) Create a sender identity linked to an SMTP account.
3) Save.
Notes
- Deleting a sender identity fails if it is used by notifications or campaigns.

Notification SMTP (system emails)
1) Go to Settings -> Policies.
2) Under "Notification email", select:
   - Notification SMTP account
   - Notification sender identity
3) Save.
Notes
- If not set, the system falls back to the default SMTP configured in the backend env.

User access
1) Go to Settings -> User access.
2) Add users with roles and access level.
3) Save.

Audiences
Create an audience
1) Go to Audiences -> New.
2) Create rules (department, location, title, status).
3) Preview to estimate recipients.
4) Save.
Notes
- You cannot edit/delete an audience linked to active campaigns
  (draft/pending/approved/scheduled/sending).

Campaigns
Create a campaign
1) Go to Campaigns -> New.
2) Fill Title, Category, Subject.
3) Select Sender identity and SMTP account.
   - Notification SMTP is filtered out to prevent accidental use.
4) Add content (HTML/Text) and optional attachments.
5) Save draft.

Submit and approvals
1) Add an audience in the Audience section.
2) Click "Submit for approval".
3) Approvers can review in Approvals.

Sending lifecycle
- Status flow: DRAFT -> PENDING_APPROVAL -> APPROVED -> SENDING -> COMPLETED.
- Once approved, the campaign is queued and sent by the worker.

Resend and re-queue
- Resend (copy): creates a new draft from an existing campaign.
- Re-queue: re-sends the same campaign (completed only).

Reports
Delivery summary
- Reports -> Delivery summary shows overall metrics per campaign.

Recipient log
- Reports -> Recipient log
- Select a campaign to see every recipient status, retry count, last error,
  and last update time.

SMTP provider tips
Gmail
- Use an app password and enable 2FA on the account.
- Set host `smtp.gmail.com`, port `587`, TLS enabled.

AWS SES
- Use SMTP credentials from AWS SES (not your AWS console password).
- Region-specific host, for example `email-smtp.us-east-1.amazonaws.com`.

Troubleshooting
- "SMTP delete failed": the SMTP account is in use by notifications, sender
  identities, or campaigns.
- "Sender identity delete failed": the identity is used by notifications or
  campaigns.
- "Audience delete failed": linked to active campaigns.
- No notification emails: check Settings -> Policies -> Notification email.
- First-time admin setup fails: user already exists; wipe DB or use existing admin.

Security notes
- Restrict SUPER_ADMIN to trusted admins only.
- Rotate SMTP passwords if they are exposed.
