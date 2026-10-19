# AI Lead Research UX update

## Changes
- Research queue now supports backend pagination (`page`, `size`) and reports total record count/pages.
- Admin UI adds Previous/Next controls and page-size options 20, 50, and 100.
- Admin UI adds batch-size quick choices 20, 50, 100, 200 and a custom numeric input (1–200).
- Queue action reports when fewer eligible NEW leads were available than requested. Queueing does not call external AI APIs.
- Process action uses the selected batch size but backend still caps a single process request at 100 and respects the configured rolling 24-hour AI attempt limit. It may therefore process fewer than requested.
- Retry failed uses the selected size up to 200.
- Backend research queue and retry queries now fetch the requested batch size rather than being silently capped by a `Top20` query.
- Email sending remains separate and is not enabled by these changes.

## Important verification status
- ZIP structure was inspected and source edits were applied.
- Automated production build/tests could not be completed in this environment: admin dependency installation timed out, and the backend ZIP does not contain `.mvn/wrapper/maven-wrapper.properties`; no system `mvn` executable is installed.
- Before deploying, run `npm ci` and `npm run build` in the admin project; run Maven compile/tests in a complete backend checkout with Maven available. Test in staging with a single pending research record first, and verify daily attempt limits and actual OpenAI credits.
