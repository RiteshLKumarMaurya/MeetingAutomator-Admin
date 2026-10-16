# MeetingAutomator Places field selection and billing notes

## What changed
- Lead search now accepts an explicit allow-listed `fields` list: `name`, `address`, `mapsUrl`, `websiteUrl`, `phone`.
- Place ID is always requested for deduplication; `nextPageToken` is requested for pagination.
- Website and phone fields are classified as Text Search Enterprise; name/address/Maps URL are classified as Text Search Pro according to the current Google Places field-mask documentation.
- The admin search form displays the selected tier and published India pricing reference, and shows this application's logged monthly usage per tier.
- Website absence does not reject a business; website URL remains null and the business still counts as a lead.
- Daily/monthly application caps and search pause remain separate from Google billing quotas.

## Current published India pricing reference (verify before use)
Official source: https://developers.google.com/maps/billing-and-pricing/pricing-india
- Places API Text Search Pro (India): 35,000 free monthly billable events; $9.60 per 1,000 in the first paid tier shown.
- Places API Text Search Enterprise (India): 7,000 free monthly billable events; $10.50 per 1,000 in the first paid tier shown.
- The pricing applies only to billing accounts eligible for India pricing. Google aggregates usage across projects associated with the billing account; taxes/eligibility and current pricing can differ.
- The dashboard counts only requests logged by this MeetingAutomator backend. It is NOT connected to Google Cloud's live billing data and cannot see other projects or API keys. Google billing data can be delayed. Use the Google Cloud Billing reports for actual charges.

## Migration and build status
- The package includes the existing manual SQL migration for the usage ledger and settings. Apply it to the target database after taking a backup.
- Frontend build was not run because `node_modules` is absent in this environment.
- Backend compile was not verified because Maven wrapper could not download Maven from Maven Central in this environment.
- Treat the package as a code update requiring local build and integration testing, not as a verified production deployment.
