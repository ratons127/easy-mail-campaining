User manual

Overview
- This app manages bulk email campaigns with approvals, audiences, and SMTP settings.
- Roles: SUPER_ADMIN, HR_ADMIN, DEPT_ADMIN, SENDER, APPROVER, AUDITOR.

Login and first admin
1) Open `http://<server>:8080`
2) Use “First-time admin setup” to create the first SUPER_ADMIN (only works when no users exist).
3) Sign in with email + password.

Settings (SUPER_ADMIN / HR_ADMIN)
SMTP accounts
1) Go to Settings → SMTP accounts.
2) Add an SMTP account (Gmail, AWS SES, or private SMTP).
3) Save.

Sender identities
1) Go to Settings → Sender identities.
2) Create a sender identity linked to an SMTP account.
3) Save.

Notification SMTP
1) Go to Settings → Policies.
2) Under “Notification email,” select the SMTP account and sender identity used for login/reset notifications.
3) Save policies.

User access
1) Go to Settings → User access.
2) Add users with roles and access level.

Audiences
1) Go to Audiences.
2) Create an audience with rules (department, location, title, status).
3) Preview to estimate recipients.
4) Save.
Notes
- You cannot edit/delete an audience linked to active campaigns (draft/pending/approved/scheduled/sending).

Campaigns
Create a campaign
1) Go to Campaigns → New.
2) Fill Title, Category, Subject, Sender identity, SMTP account.
3) Add content (HTML/Text) and optional attachments.
4) Save draft.

Submit and approvals
1) Add an audience in the Audience section.
2) Click “Submit for approval.”
3) Approvers can review in Approvals.

Sending
1) Once approved, the campaign is queued and sent by the worker.
2) Status changes: DRAFT → PENDING_APPROVAL → APPROVED → SENDING → COMPLETED.

Resend and re-queue
- Resend (copy): creates a new draft from an existing campaign.
- Re-queue: re-sends the same campaign (completed only).

Reports
Delivery summary
- Reports → Delivery summary for overall metrics.

Recipient log
- Reports → Recipient log
- Select a campaign to see every recipient status, retry count, last error, and last update time.

Troubleshooting
- SMTP delete failed: account is in use (notifications, sender identities, or campaigns).
- Sender identity delete failed: identity is in use (notifications or campaigns).
- Audience delete failed: linked to active campaigns.
- If notifications aren’t sent, verify Settings → Policies → Notification email.

