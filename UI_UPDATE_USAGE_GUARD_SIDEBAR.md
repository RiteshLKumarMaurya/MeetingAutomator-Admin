# MeetingAutomator Admin UI update — Usage Guard + collapsible sidebar

## Changes
- Lead Generation now shows a visible Usage & Billing Guard panel above the search form.
- Shows app-recorded daily/monthly request counts, remaining app caps, estimated cost and estimated budget remaining.
- Visible controls for enabling/disabling the server-side guard, daily/monthly request caps, pages per keyword, monthly estimated budget, estimated price per 1,000 requests, and warning threshold.
- Adds direct buttons to check Google Cloud Monitoring and Billing export endpoints, with returned status/message shown in the panel.
- Shows the latest five app request ledger events.
- Refreshes the app usage summary every minute without overwriting any unsaved control edits.
- Preserves billing-account/export identifiers when saving guard settings.
- Desktop dashboard sidebar now collapses to an icon rail and expands again, with preference stored in localStorage. Mobile drawer remains unchanged.
- Lead Generation content uses the available page width to improve table visibility.

## Important billing caveat
This UI does not make Google Cloud billing data real-time. Monitoring and billing export buttons report what the backend endpoints actually return. Billing export must be configured and the VPS runtime identity must have permissions. App-side estimates are not a Google invoice or a guaranteed free-quota balance. Google Cloud budget alerts do not hard-stop spending.

## Validation
- TypeScript/TSX transpile syntax check passed for the two modified files.
- Full Next.js build/typecheck was not completed: dependencies could not be installed in this environment (`next` executable unavailable after npm install timed out). Run `npm ci` then `npm run build` on the development machine before deployment.
