# Meeting Automator — Release Audit Notes

This archive preserves the existing independent application and API structure. Read this file before deployment.

## Verification performed in the packaging environment
- ZIP extraction and expected project structure checked.
- Environment-specific local configuration files removed; `.env.example` files are provided instead.
- Production URLs and cross-application configuration reviewed statically.

## Verification limitations
A full dependency-backed build/test run could not be completed in this environment: external package downloads were unavailable/timed out. Do not interpret this note as a claim that every runtime path has been integration-tested. Run the commands below in CI or a network-enabled build host before promoting to production.

## Production gate
1. Configure environment variables in the deployment platform (do not commit real secrets).
2. Build each frontend with its production public environment values.
3. Run backend Maven tests and package.
4. Smoke-test login, public booking, admin approval, timezone handling, Google Calendar/Meet, email, media upload/read, payment/webhook if enabled, cancellation/rescheduling, and role-based access against a staging database.
5. Verify browser console/network logs and server logs after deployment.

## Admin frontend checks
- `npm ci`
- `npm run check`

The admin API fallback now targets the production API domain rather than silently defaulting to localhost. Set `NEXT_PUBLIC_API_URL` explicitly for each environment.
