# Frontier OS Working Contract

## Product wedge

Company website + one non-confidential PDF
-> evidence-first acquisition screen
-> extracted document claims
-> public-source checks
-> unknowns
-> diligence blockers
-> next questions
-> documents to request
-> save to Deal Cockpit.

## Trust rules

- No fabricated data.
- No fake revenue, ARR, customer count, Companies House facts or verified facts.
- PDF/deck data is company claim evidence unless externally verified.
- Public-source verified facts require source URL/source metadata.
- Cerillion revenue may be verified only if source-backed by annual report/results/filing.
- TriloDocs must never show fake GBP45.4m / ARR GBP30m.
- No ExampleSoft fallback.

## Live backend

https://web-production-0224c.up.railway.app

## Frontend env

VITE_FRONTIER_API_BASE_URL=https://web-production-0224c.up.railway.app

## FE owns

- UX, navigation, rendering, state handling
- Run page mode selector
- Result dashboard
- Cockpit display
- Pricing CTA handling
- Request pilot frontend state
- Never inventing fields not returned by backend

## BE owns

- API routes and schemas
- Evidence extraction
- Claim classification
- URL validation
- Document-assisted endpoint
- Origination endpoint
- Pricing/contact/cockpit API responses
- Tests

## Shared contract

Frontend renders only backend payload.
Backend returns structured payloads that frontend can render.
If a capability is unavailable, backend returns structured unavailable response.
Frontend must not treat unavailable as success.
Frontend must treat valid result payloads as success.

## Current priority

1. Website + document as primary Run workflow.
2. Website-only as fallback.
3. Clean unavailable document-assisted hosted state.
4. Clean result dashboard.
5. Cockpit saved-run dashboard.
6. FE uses backend capabilities instead of static placeholders.
