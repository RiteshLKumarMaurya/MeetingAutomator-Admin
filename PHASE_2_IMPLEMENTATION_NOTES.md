# MeetingAutomator Phase 2 — Outreach Workflow

## Included
- Admin-only REST endpoints under `/api/v1/admin/outreach` for listing, creating, editing drafts, and manually updating sequence statuses.
- Outreach sequence records linked to existing `sales_leads` rows.
- Personalized call-script draft generated from saved lead name, city, website, and phone fields. This is deterministic template generation, not AI web research.
- Admin dashboard at `/dashboard/outreach`, with lead selection, draft editor, sequence list, manual status updates, stop-state display, and sending-disabled notice.
- Manual SQL scripts:
  - `src/main/resources/db/manual/V20261018__lead_research_workflow.sql`
  - `src/main/resources/db/manual/V20261018_2__outreach_sequence.sql`
- `sending_enabled` defaults to false. The API rejects manual transition to `SENT`; there is no outbound sender or scheduler in this phase.
- Stop states: `INTERESTED`, `NOT_INTERESTED`, `UNSUBSCRIBED`, `DO_NOT_CONTACT`, `MEETING_BOOKED`, `COMPLETED`, `SKIPPED`. A stopped sequence cannot be reactivated through the status API; a stop outcome propagates to other unsent steps for the same lead while preserving any historical `SENT` record.
- Basic enum tests for stop-state behavior.

## Not included by design
- AI or web-based lead research and evidence collection.
- Scheduled execution or background jobs for outreach.
- Sending email, WhatsApp, LinkedIn, Instagram messages, or placing calls.
- Inbox/reply detection, bounce detection, and social-platform integrations.
- This phase does not automatically change the existing lead's status when an outreach sequence status changes.

## Migration safety
These are manual SQL scripts and are not automatically applied by this package. Back up the target database, inspect the existing `sales_leads` schema, and test both scripts on staging before applying them anywhere. No production database was accessed or modified during this work.

## Verification status
The source ZIP archives passed ZIP integrity checks before changes. Full Maven and Next.js builds/tests still need to be run in an environment with dependencies available. Do not treat this package as production-certified until those commands and staging API/UI tests pass.
