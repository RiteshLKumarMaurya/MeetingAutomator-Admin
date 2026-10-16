# Lead Generation in MeetingAutomator Admin

The Lead Generation page is available at `/dashboard/leads` and uses the existing admin session/token refresh flow. It does not add a separate login or a second website.

## Local testing

1. In the Google Cloud Console, confirm the API key belongs to the `MeetingAutomator` project and is restricted to **Places API (New)** only.
2. In the same terminal used to start the Spring Boot backend, set `GOOGLE_PLACES_API_KEY` to the new restricted key. Do not place the key in a `NEXT_PUBLIC_*` variable or frontend code.
3. Start the backend on its existing port (the provided dev profile defaults to `8057`) and start the admin app on port `3000`.
4. Sign in to the existing admin panel and open **Workspace → Lead Generation**.
5. Search a keyword and city. The service requests up to 20 results per search and saves them using Place ID deduplication.

## VPS deployment

- Configure `GOOGLE_PLACES_API_KEY` in the backend's process manager/environment; do not commit it.
- Restrict the production key to the VPS's actual outbound public IP and Places API (New) only. The local laptop key and VPS key should be separate.
- Before deployment, apply the SQL in the backend's `src/main/resources/db/manual/V20261016__create_sales_leads.sql` to the production PostgreSQL database. The production profile uses schema validation, not automatic schema updates.

## Included functionality

- Search by keyword + city.
- Automatically save new leads and deduplicate by Place ID.
- Preserve insertion order.
- List/filter leads and change status.
- CSV export (Excel-compatible).
- Google Places details are cleared after 30 days; Place IDs are retained for deduplication.
