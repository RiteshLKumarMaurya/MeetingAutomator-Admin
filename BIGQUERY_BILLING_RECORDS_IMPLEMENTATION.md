# MeetingAutomator — BigQuery Billing Records

## What changed
- Backend: `GET /api/v1/admin/leads/usage/google-cloud/billing/records?search=&limit=100` queries the configured Standard Cloud Billing export table using Application Default Credentials. It returns the latest rows with usage time, service, SKU, project, gross cost, credits, net cost, currency, and export time. Limit is capped at 100; search matches service/SKU/project.
- Admin: Usage & Billing Guard now automatically checks the records endpoint when the leads page opens. It shows a clean, responsive billing records table, a service/SKU/project filter, explicit empty/configuration/error states, and a manual refresh button.
- Existing Monitoring, app usage ledger, request caps, and current Places-only billing summary remain in place.

## Admin configuration
Open **Dashboard → Leads → Cloud connection details** and save:
- Billing Account ID: `0103A5-0D1F01-09C34F`
- Export project ID: `meetingautomator-9e982`
- Dataset ID: `billing_export`
- Table ID: `gcp_billing_export_v1_0103A5_0D1F01_09C34F`

Use the exact IDs for the current account/export. The account ID is a non-secret identifier.

## Backend runtime permissions
The backend process must have Application Default Credentials available. The runtime identity needs permission to run BigQuery query jobs (BigQuery Job User on the query project) and read the export dataset (BigQuery Data Viewer on the dataset), plus the BigQuery API enabled. Local ADC on a developer PC does not automatically exist on the VPS. Prefer a dedicated runtime service account/workload identity; do not commit credential JSON or put credentials in the frontend.

## Important behavior
- Billing export is delayed and not real-time. This feature reads the rows already present in BigQuery; it does not trigger export ingestion or create billing rows.
- Empty state is expected until Google starts populating the newly enabled export.
- Table is limited to the latest 100 records, with search. It is not a complete invoice/report export.
- BigQuery query charges may apply.

## Validation performed
- Admin TSX was transpiled with the installed TypeScript compiler; no syntax diagnostics were reported.
- Full Maven compile could not be run in this environment because Maven wrapper could not download Maven from Maven Central. The package is not represented as fully build-verified; run the normal backend build and admin production build in your environment before deploying.
