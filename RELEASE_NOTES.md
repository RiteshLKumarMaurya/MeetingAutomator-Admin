# Release Notes — Independent Admin Frontend

## Separation
- Removed the embedded admin dashboard from the public Meeting Automator frontend.
- Created a standalone admin application with its own `/login` and `/dashboard` routes.
- Uses a separate persisted auth namespace: `meetingautomator-admin-auth`, so admin and public sessions cannot overwrite each other.

## Complete admin surface
The sidebar exposes every admin backend domain present in the supplied backend:
Users, Roles and Consultations, Consultation Settings, Projects, Project Bundles, Packages, Services, Technologies, Testimonials, Features, Banners, Web Links, Links, Notifications and Technical/System Settings.

## Reliability fixes
- Auth boot/refresh flow retains sessions during transient network/5xx failures.
- Backend 401/403 responses are treated separately from network failures.
- Notification multi-user IDs are submitted as repeated multipart `userIds` values matching the Spring `List<Long>` request field.
- Conflicting duplicate settings DTO declarations were removed from the admin type model.
- Independent admin origin is included in the backend CORS default; `MEETING_AUTOMATOR_ALLOWED_ORIGINS` remains the production override.

## Validation performed here
- All admin TypeScript/TSX source files parse successfully.
- All local `@/` imports resolve.
- All referenced local public assets resolve.
- Every supplied backend admin controller has a corresponding admin UI module/API surface.

A complete dependency-backed `next build` and live API E2E test require the deployment environment because the packaging runtime cannot download the project's npm dependencies or reach the production API.
