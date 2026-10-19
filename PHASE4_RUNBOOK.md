# MeetingAutomator Phase 4 — Personalized Outreach Drafts

## Scope
- Reuses completed AI research records to create editable EMAIL, LINKEDIN, INSTAGRAM, WHATSAPP, and CALL draft sequence items.
- Carries research source URLs into each draft record and displays them in the Outreach Workspace.
- Adds a visible human-review warning to every generated draft.
- Flags common risky claims (guarantees, quantified savings/results, percentages, superlatives) for manual source verification.
- Blocks draft generation for deleted leads and leads with a terminal/suppression outcome.
- Requires completed research with at least one valid HTTP(S) evidence URL.
- All generated items start as DRAFT with sending disabled. No message is sent.

## Files
- Backend endpoint: `POST /api/v1/admin/outreach/leads/{leadId}/generate-personalized-drafts`
- Outreach response includes `evidenceUrls` and `personalizationWarnings`.
- Migration: `src/main/resources/db/manual/V20261021__phase4_personalized_outreach_evidence.sql`
- Admin screen: Dashboard → Outreach → select lead → Generate researched drafts.

## Safe setup
1. Back up the development/staging database.
2. Apply the migration to development/staging only. Do not run it against production without a reviewed release plan.
3. Install Admin dependencies with `npm ci`, then run the project's configured check/build scripts.
4. Run backend tests using `./mvnw test` (Windows: `mvnw.cmd test`) where Maven can be downloaded.
5. Configure AI research only if the OpenAI account has available API credits. Research/draft generation does not send messages.
6. Select a lead with completed, evidence-backed research and generate drafts. Review every factual sentence against the displayed source links, edit as needed, and confirm contact permission before use.
7. Confirm the Oasis Immigration record remains suppressed and cannot generate drafts.

## Expected behavior
- If research is missing, failed, incomplete, or lacks source URLs, the endpoint returns a clear conflict and creates no drafts.
- If the lead is suppressed or deleted, no drafts are created.
- Drafts are editable in Outreach Workspace. Editing an approved draft returns it to DRAFT (existing Phase 2 behavior).
- Automatic sending, social-platform posting, and follow-up scheduling remain disabled.
