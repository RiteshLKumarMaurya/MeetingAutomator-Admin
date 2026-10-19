# MeetingAutomator Final Review Bundle — 2026-10-19

## What changed

### Admin frontend
- Added per-row lead selection checkboxes.
- Added select-visible-page and select-first-20-on-current-page actions.
- Added bulk delete with one explicit confirmation and a result summary.
- Single-record deletion retains a confirmation prompt.
- Export dialog lets an admin choose selected leads, the visible page, or all saved leads.
- Export dialog lets an admin choose which fields to include in CSV or XLSX.
- Exports call the authenticated backend endpoints; the backend validates selected field names and lead IDs.

### Backend
- CSV/XLSX export endpoints now accept optional `ids` and `fields` query parameters.
- Export fields are allowlisted and formula-like CSV cells remain escaped.
- Research failures log a full stack trace server-side without logging request authorization headers.
- OpenAI HTTP errors are surfaced with sanitized status/context (e.g. insufficient credits) instead of only a generic provider error.
- Fixed the provider unit test constructor setup.

## Required backend environment

Keep the existing database, JWT, Google Places, OAuth, SMTP, R2/CDN and other production variables as currently configured. Do not rotate keys without a planned migration.

Required/relevant for this release:
- `APP_LEAD_RESEARCH_ENCRYPTION_KEY`: stable, random, 32+ characters, backend only. Do not change after API credentials have been encrypted with it.
- OpenAI API key: enter in Admin > AI Lead Research > Research Settings. It is encrypted in the database. OpenAI API billing/credits are separate from ChatGPT subscriptions.
- `APP_OUTREACH_EMAIL_ENABLED=false` initially.
- `APP_OUTREACH_UNSUBSCRIBE_SECRET`: random secret 32+ characters, distinct from the webhook secret.
- `APP_OUTREACH_PUBLIC_BASE_URL=https://api.meetingautomator.com` (change if your production API domain differs).
- `APP_OUTREACH_REPLIES_WEBHOOK_SECRET`: a separate random secret 32+ characters.
- SMTP: `MEETING_AUTOMATOR_SMTP_HOST`, `MEETING_AUTOMATOR_SMTP_PORT`, `MEETING_AUTOMATOR_MAIL_USERNAME`, `MEETING_AUTOMATOR_MAIL_PASSWORD`, `MEETING_AUTOMATOR_MAIL_FROM`, `MEETING_AUTOMATOR_MAIL_FROM_NAME`, `MEETING_AUTOMATOR_MAIL_REPLY_TO`.

Do not put secrets in frontend `.env.local`, `NEXT_PUBLIC_*`, source code, or Git.

## Email sending activation

The email sending feature has a backend hard gate and defaults off. Do not set `APP_OUTREACH_EMAIL_ENABLED=true` until:
1. SMTP credentials are verified from the backend runtime.
2. Sending has been tested in staging with an internal test recipient.
3. Consent/appropriate lawful basis, suppression/opt-out, unsubscribe links, bounce handling and stop-on-reply behavior have been checked.
4. Daily caps and sender identity have been reviewed.
5. Admin manually reviews and approves drafts.

The AI research module does not send email by itself. Research drafts require a separate, explicitly gated outreach workflow.

## OpenAI billing blocker seen in user's log

The supplied logs showed HTTP 429 `insufficient_quota` / `credit_balance_exhausted`. The connection test only checks API key/model listing and can succeed even when API credits are zero. Add API credits to the correct OpenAI organization, verify balance, then test one lead before retrying the remaining queue. Do not change the encryption key to solve a billing issue.

## Build and deployment checklist

1. Unzip backend and admin into separate folders; preserve existing runtime secrets in Coolify.
2. Backend: `./mvnw test` (Windows PowerShell: `.\mvnw.cmd test`) in an environment where Maven dependencies can be downloaded.
3. Admin: `npm ci` then `npm run build` in an environment with network access to the npm registry.
4. Deploy backend first, then admin.
5. Verify admin login, lead page pagination, select one/page/20, delete confirmation, CSV export field selection, XLSX export field selection, research settings save/test, and one research job.
6. Test SMTP only with an internal recipient before enabling live outreach.
7. Verify reply webhook with a test message and confirm pending follow-ups stop on reply.

## Verification limitation

This packaging environment did not have a usable Maven installation or installed frontend dependencies, and outbound dependency downloads were unavailable/time-limited. The edited TSX passed TypeScript transpile/syntax parsing, but a full Next.js production build and Maven test/compile could not be completed here. Run the build checklist above before production deployment.
