# Frontier OS Product Surface Status

Last updated: 2026-07-04

## Reviewer-Ready Product Wedge

| Surface | Route | Backend support | Product status | Decision |
| --- | --- | --- | --- | --- |
| Website + document acquisition screen | `/app/run` | `POST /api/analyse/document-assisted` | Hosted unavailable until document uploads enabled; local/private beta prototype exists | Primary UX, but show clean unavailable on hosted. |
| Website-only public-source preview | `/app/run` | `POST /api/analyse/url` | Live | Fallback and still usable when no document is available. |
| Result dashboard | `/app/run` result step | URL and document-assisted payloads | Live/partial | Render backend payload only; unknowns/blockers are not failures. |
| Deal Cockpit saved runs | `/app/cockpit` | Cockpit endpoints plus local fallback | Partial live | Clean saved-runs dashboard; no repeated unavailable filler. |
| Pricing | `/pricing` | `GET /api/pricing/plans` | Live | Backend source of truth; Starter/Growth use Stripe `cta_url`. |
| Request pilot | `/request-pilot` | `POST /api/contact` | Live but email may be unconfigured | Show `sent:false/email_not_configured` honestly. |

## Secondary Surfaces

| Surface | Route | Backend support | Product status | Decision |
| --- | --- | --- | --- | --- |
| Compare | `/app/compare` | `POST /api/analyse/compare` | Live | Require two real targets; no fake comparison. |
| Origination | `/app/origination` | `POST /api/origination/thesis` or `/run` | Private-beta reference universe | Render targets/empty state/unavailable honestly. |
| AI Risk | `/app/ai-risk` | Target-specific data only through analysis result | Preview/locked | Explain what will be assessed; do not imply live target research. |
| Trust | `/trust` | Static trust contract | Safe static | Keep claims vs verified facts, no confidential docs, source metadata rules. |
| Exports | `/app/exports` | Export/report scaffolds only | Locked/team beta | CTA to run a document-assisted screen first. |
| Settings / Workspace | `/app/settings` | Workspace state, configured backend health | Live diagnostics | Hide raw IDs/API details in collapsed Developer diagnostics. |

## Static/Mock Risk

| Risk | Status |
| --- | --- |
| ExampleSoft contamination | Must not appear in real workflows. |
| Fake TriloDocs GBP45.4m / ARR GBP30m | Must not appear. |
| Document-assisted unavailable shown as complete | Guarded in Run page via unavailable detection. |
| Successful backend payload shown as failed | Guarded via shared usable-payload detection. |
| Local API unreachable shown as scary product error | Settings now checks configured `/api/health` and keeps diagnostics collapsed. |
| Origination empty target list shown as unavailable | Origination page treats empty `status:"ok"` as empty state. |

## Copy Rules

- Document metrics are `Company claim` and `Not independently verified` unless backend returns an external verified fact.
- Public-source verified facts require source URL/source label/source metadata.
- Cerillion revenue may show verified only when backend returns source-backed evidence.
- Origination always says private-beta reference universe, no live crawling, no paid data providers, no verified revenue/ARR/EBITDA/customer concentration.
- Missing fields should be hidden or turned into useful next actions, not repeated as generic unavailable text.

## Current State

| Patch | Status |
| --- | --- |
| Website + document selector on Run page | Done |
| Website-only fallback on Run page | Done |
| Document-assisted hosted unavailable state | Done |
| Shared success detection for backend payloads | Done |
| Backend-driven pricing | Done |
| Request pilot honest email-not-configured state | Done |
| Settings configured backend health | Done |
| Shared contract docs | Done |
