# Meeting Automator Admin — Final QA

- Overview is consultation-first: total, today, pending and confirmed consultation metrics.
- Added six-month consultation volume graph and consultation status distribution.
- Added Recent Consultations section.
- Removed Contact Requests from the admin navigation, dashboard, route and admin API surface.
- Added functional Roles module backed by `/api/v1/admin/roles` with list/create/update/delete.
- Added logout confirmation before the session is cleared.
- Removed GrocerFlow-branded root logos and admin-assets.
- Admin UI uses Meeting Automator logo assets and lucide-react UI icons.
- Media default is `https://media.meetingautomator.com`; production can override with `NEXT_PUBLIC_CDN_URL`.
- Kept the standalone admin architecture and existing authentication/security flow.
- The consultation graph uses the `scheduledAt` field exposed by the existing admin booking summary endpoint, so no backend change is required.

A dependency-backed Next.js production build was not run in this environment. Run `npm install` followed by `npm run build` in a fresh extracted directory before deployment.
