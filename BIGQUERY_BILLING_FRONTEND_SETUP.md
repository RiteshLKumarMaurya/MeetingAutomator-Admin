# MeetingAutomator Admin — BigQuery Billing UI

This admin package adds the Google Cloud billing records section to **Dashboard → Leads** and retains the Lead Settings billing-export identifiers.

## Required backend endpoints
- `GET /api/v1/admin/leads/usage/google-cloud/billing/records?search=&limit=100`
- `GET /api/v1/admin/leads/usage/google-cloud/billing`
- `GET /api/v1/admin/leads/usage/google-cloud/monitoring`
- `GET /api/v1/admin/leads/usage`
- `PUT /api/v1/admin/leads/usage/settings`

The billing records UI expects `data.records`, `data.connected`, `data.status`, `data.message`, `data.retrievedAt`, and `data.rowCount`; each row can include `usageStartTime`, `service`, `sku`, `projectId`, `cost`, `credits`, `netCost`, `currency`, and `exportTime`.

## Configuration
In **Dashboard → Leads → Cloud connection details**, save:
- Billing Account ID: `0103A5-0D1F01-09C34F`
- Export project ID: `meetingautomator-9e982`
- Dataset ID: `billing_export`
- Table ID: `gcp_billing_export_v1_0103A5_0D1F01_09C34F`

These identifiers are not secrets. Never put service-account keys or ADC credentials in frontend environment variables.

## Build
From the `admin` directory:
```powershell
npm ci
npm run build
```

The currency helper's TypeScript `number | undefined` issue has been corrected in this package. The full production build has **not** been run in this environment; run the build locally before deployment. The backend must implement the records endpoint and have BigQuery access. An empty records table is expected until Google populates the billing export.
