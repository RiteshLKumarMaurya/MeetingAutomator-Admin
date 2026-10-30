# Lead Generation Improvements — 2026-10-30

## Included
1. Google Places search fields are selected by default: business name, address, Maps URL, website, phone, average rating, and rating count. Search still requires the existing confirmation prompt before any billable search starts. The confirmation now lists the selected fields.
2. Google Places rating (`rating`, out of 5) and rating count (`userRatingCount`) are persisted and returned by the backend. Admin lead table displays both values.
3. Every lead's database ID is visible in the admin table and is included by default in CSV/XLSX exports.
4. CSV/XLSX export supports rating and rating-count columns.
5. Admin table supports ascending/descending lead-ID ordering. The selected order is applied server-side to pagination.

## Database action required
Before deploying the updated backend, apply:
`src/main/resources/db/manual/V20261030__add_lead_ratings.sql`

The migration adds nullable columns and preserves all existing lead rows.

## Important Google billing note
Selecting website, phone, rating, or rating count requests Enterprise-tier fields under the app's existing SKU estimator. The default-all selection can therefore increase Google Places usage cost. Review Google Cloud billing and the app's configured request/budget caps before searching.

## Validation status
Source-level consistency checks were performed. A full frontend build and backend Maven package could not be run in this environment: frontend dependencies are not installed (`next: not found`) and Maven wrapper download was unavailable. Run the normal CI/build pipeline before production deployment.
