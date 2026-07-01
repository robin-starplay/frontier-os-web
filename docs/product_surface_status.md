# Frontier OS Product Surface Status

Last updated: 2026-07-01

This document is the product-facing matrix for what the reviewer/private-beta frontend should show.

## Reviewer-Ready Wedge

| Surface | Frontend route | Backend support | Product status | Decision |
| --- | --- | --- | --- | --- |
| Company website screen | `/app/run`, `/run` | `POST /api/analyse/url` | Live public-source preview | Keep as primary product path. |
| Public Evidence Pack | Result screen inside `AnalysisSetup.tsx` | URL analysis response | Live | Keep. Expand carefully, no fabricated values. |
| One non-confidential PDF review | `DocumentReviewPanel.tsx` | `POST /api/documents/review` | Prototype | Show as prototype/free-preview if routed. Non-confidential PDF only. |
| Save to Deal Cockpit | Run/compare/document flows | `POST /api/cockpit/save-run`, cockpit endpoints | Live/partial | Keep, but fallback to local storage only when backend save is unavailable. |
| Pricing | `/pricing` | `GET /api/pricing/plans` | Live | Keep backend-driven. |

## Secondary or Partial Surfaces

| Surface | Frontend route/file | Backend support | Product status | Decision |
| --- | --- | --- | --- | --- |
| Compare targets | `/app/compare`, `/compare` | `POST /api/analyse/compare` | Live endpoint, patched frontend | Keep as secondary. User must enter real targets. No placeholder comparison. |
| Origination | `/app/origination`, `/origination` | `POST /api/origination/thesis` | Private-beta reference universe | Show backend targets only, with reference-universe warning. If hosted route is unavailable, show clean unavailable state. |
| Deal Cockpit | `/app/cockpit`, `/cockpit` | Cockpit endpoints plus local history | Partial | Keep, but prioritize real saved runs and target-specific actions. |
| Evidence workflow page | `/app/evidence`, `/evidence` | Evidence endpoints exist; page mostly static | Partial/static | Replace with live document/evidence workflow or lock as private beta. |
| AI Risk | `/app/ai-risk`, public AI pages | Run response has AI fields; standalone page is static | Private beta/static | Keep as roadmap/private-beta unless target-specific backend data is present. |
| Exports | `/app/exports`, `/reports`, `/memo` | Reporting tools exist, no live export UX wired | Locked | Keep locked/private beta. |
| Quality-first analysis | No default route | Backend returns structured unavailable on hosted worker gap | Private pilot | Do not default to this. Explain hosted worker requirement. |

## Surfaces to Avoid in Reviewer Main Flow

| Surface | Reason |
| --- | --- |
| Demo sample result routes | They can contaminate reviewer trust if confused with live analysis. |
| Soft-launch demo scenarios | Useful for internal demos only. |
| Legacy async `/analysis` flow | Worker/old pipeline path. Do not use as default public preview. |
| Static memo/report pages | Risk of implying generated exports before live run-backed export is wired. |
| Example cockpit previews | Must not be shown above real empty states or saved runs. |

## Copy and Evidence Rules

- Say `Public-source preview. Evidence checked. Gaps flagged.` for the default run.
- Say `Preparing public-source preview` for progress step 1.
- Say `Quality-first is available for private pilots once the hosted worker is enabled.` only near private-pilot positioning.
- Verified financials require backend `status === "verified"` and concrete source metadata.
- Company claims and document-derived items must be labelled as claims unless externally verified.
- Public signals are useful, but not verified facts.
- Empty states should be actionable: explain the source or document needed next.

## Current Patch Status

| Patch | Status |
| --- | --- |
| Remove compare placeholder comparison | Done |
| Remove compare API fallback | Done |
| Remove origination illustrative target list | Done |
| Keep origination wired to backend endpoint | Done: frontend calls `/api/origination/thesis`; hosted unavailable is handled cleanly |
| Preserve public-source default run | Done |
| Document backend/frontend capability map | Done |
