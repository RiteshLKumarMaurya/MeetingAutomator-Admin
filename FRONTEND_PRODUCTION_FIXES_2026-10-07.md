# Frontend production fixes — 2026-10-07

## Admin frontend
- Persisted-session token validation sends the access token in the `Authorization` header, matching the backend contract.
- Media URLs use the canonical `NEXT_PUBLIC_MEDIA_BASE_URL` environment variable.
- Added a production `.env.example` using the public API, R2 media hostname, admin site URL, Google client ID and Clarity project ID.

## Production API
- Canonical API base: `https://api.meetingautomator.com`.
- Canonical media base: `https://media.meetingautomator.com`.
