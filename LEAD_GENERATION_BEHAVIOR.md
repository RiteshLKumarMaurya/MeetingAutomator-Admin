# Lead generation behavior update

- Numeric targets search across geographic cells until the requested number of newly saved unique leads is reached or available coverage/request/budget caps stop the search.
- The backend page size is set to the remaining target (maximum 20) so a single Google page does not intentionally save more than the target.
- If the target is reached while a next page token or additional geographic cells remain, the admin asks whether to continue searching beyond the target. Confirm continues across remaining coverage; Cancel stops at the target.
- “All available leads” searches all generated geographic cells until coverage is exhausted, the user stops, or backend request/budget limits stop further calls.
- Google Places only returns a bounded set per query and Google results are not guaranteed to contain every business. The app preserves Place ID deduplication and existing backend usage guardrails.
