# Lead-generation geographic search patch

## Admin project
- Removed the frontend's hard-coded 60-lead target clamp.
- Added geographic-cell searches based on the resolved city viewport, each with its own Google Places pagination sequence.
- Added an in-progress Stop search control. It stops after the current network request returns.
- Kept existing API routes, lead list, export, authentication, and usage dashboard in place.
- The UI target is limited to 1–1000 unique leads. The actual count is not guaranteed: Google may return fewer businesses, and the configured backend usage/budget caps can stop the run.

## Backend project
- Added `GET /api/v1/admin/leads/search/bounds?city=...` using Google Geocoding API to resolve a city viewport.
- Added optional `locationRestriction` rectangle support to the existing lead search request.
- Preserved the original five-argument `LeadSearchRequest` constructor for existing tests/call sites.
- Existing database unique constraint and Place-ID deduplication remain the final duplicate guard.

## Before production use
- Enable the Google Geocoding API for the same Google Cloud project/key, and make sure the key's API restrictions permit both Geocoding API and Places API (New).
- A boundary lookup can incur Geocoding API charges. The current lead usage dashboard counts Places requests; verify Geocoding usage/billing separately in Google Cloud.
- Search is browser-orchestrated and is not a durable server-side job. Closing/reloading the page interrupts further discovery, but leads already saved remain in the database.
- The geographic grid is capped at 120 cells as a safety guard; large city viewports may not be exhaustively covered. This is coverage expansion, not a guarantee that every business is discoverable.
- Build/test could not be completed in this environment: Maven wrapper could not download Maven from Maven Central, and the admin `node_modules` directory was absent. Run backend `./mvnw test` and admin `npm ci && npm run check` in your build environment before deployment.
