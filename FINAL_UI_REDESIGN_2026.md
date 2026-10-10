# Meeting Automator Admin — Final UI Redesign

The administration routes and data operations are preserved. The redesign focuses on clarity, density, and predictable operational use.

## Design direction

- Quiet operations workspace rather than marketing-style dashboard UI
- Blue primary actions aligned with the public website
- High-contrast light/dark surfaces
- Consistent cards, tables, inputs, modal surfaces, and sidebar navigation
- Cleaner login experience
- Existing booking, CMS, user, notification, settings, and content routes remain intact

## Production API/media defaults

- API: `http://localhost:8057`
- Media: `https://media.meetingautomator.com`

Media helpers prefer the backend's new single-object R2 response (`url` / `objectKey`) and fall back to legacy aliases when present.
