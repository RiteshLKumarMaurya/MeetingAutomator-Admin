# Meeting Automator — Independent Admin Frontend

This is the standalone administrator frontend for Meeting Automator. It is intentionally separated from the public/user-facing frontend and is designed to be hosted on its own domain/subdomain.

## Included modules

- Overview
- Consultations
- Consultation Settings
- Projects
- Project Bundles
- Packages
- Services
- Technologies
- Testimonials
- Features
- Banners
- Web Links
- Links
- Users & Roles
- Notifications
- Technical/System Settings

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://YOUR-MEETING-AUTOMATOR-API
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
NEXT_PUBLIC_CDN_URL=https://YOUR-CDN
```

The browser never receives backend credentials. Authentication is JWT based and administrator access is enforced by the backend `ROLE_ADMIN` authority.

## Run

```bash
npm ci
npm run build
npm start
```

For local development:

```bash
npm run dev
```

## Hosting

Recommended independent URL: `https://admin.meetingautomator.com`.

Add the exact admin origin to the backend `MEETING_AUTOMATOR_ALLOWED_ORIGINS` environment variable. Google OAuth must also allow the exact admin origin.
