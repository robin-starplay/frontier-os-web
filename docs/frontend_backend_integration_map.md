# Frontend Backend Integration Map

Last updated: 2026-07-04

Frontend repo: `/Users/rb/frontier-os-web`  
Backend repo: `/Users/rb/ai-agent-test`  
Required env: `VITE_FRONTIER_API_BASE_URL=https://web-production-0224c.up.railway.app`

## Backend Source of Truth

All product workflows must call the configured backend base URL when `VITE_FRONTIER_API_BASE_URL` is present. The frontend must not silently switch to local `/api` for live reviewer flows.

## Frontend Routes

| Route | Component | Backend endpoint used | Real backend data rendered | Static/mock risk | Demo-safe status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| `/app/run` | `src/pages/AnalysisSetup.tsx` | `POST /api/analyse/document-assisted`, `POST /api/analyse/url`, cockpit save fields | Yes | Low if sample mode is avoided | `primary_wedge` | Website + document is recommended; Website-only remains fallback. |
| `/app/cockpit` | `src/pages/DealCockpitPage.tsx` | `GET /api/cockpit/summary`, `GET /api/cockpit/runs`, local run history fallback | Partial | Medium if local examples appear before real empty state | `usable_partial` | Keep saved-runs dashboard clean; distinguish URL/document/compare. |
| `/app/compare` | `src/pages/CompareTargetsPage.tsx` | `POST /api/analyse/compare` | Yes | Low | `secondary_live` | Requires at least two user-entered targets; no placeholder comparison. |
| `/app/origination` | `src/pages/OriginationPage.tsx` | `POST /api/origination/thesis`, fallback `POST /api/origination/run` | Yes | Low | `private_beta_reference_universe` | Empty targets are a clean empty state, not unavailable. |
| `/pricing` | `src/pages/PricingPage.tsx` | `GET /api/pricing/plans` | Yes | Low | `live` | Starter/Growth uses backend external Stripe `cta_url`; Team/Enterprise uses request pilot. |
| `/request-pilot` | `src/pages/RequestPilotPage.tsx` | `POST /api/contact` | Yes | Low | `live_but_email_may_be_unconfigured` | Show `email_not_configured` honestly with mailto and booking CTA. |
| `/app/ai-risk` | `src/pages/AIDisruptionPage.tsx` | none target-specific | No | Medium | `preview_locked` | Label as beta/explanatory unless backed by a run result. |
| `/trust` | `src/pages/TrustPage.tsx` | public trust copy; optional backend `/trust` not required | Mostly static trust contract | Low | `safe_static` | Emphasize claims vs verified facts and no confidential docs in preview. |
| `/app/exports` | `src/pages/ExportsPage.tsx` | no live export endpoint | No | Low if locked | `locked_team_beta` | CTA to run document-assisted screen first; no upload primary flow here. |
| `/app/settings` | `src/pages/SettingsPage.tsx` | configured backend `/api/health`, local workspace/run state | Yes for status/local state | Low | `diagnostics_collapsed` | Raw IDs/API details stay in Developer diagnostics. |

## Frontend API Clients

| File | Endpoints | Contract |
| --- | --- | --- |
| `src/lib/frontierApi.ts` | `/api/analyse/url`, `/api/analyse/document-assisted`, `/api/analyse/compare`, cockpit endpoints, legacy `/analysis*` helpers | Returns backend JSON. Valid result payloads are success unless explicitly `error`/`unavailable`. Document unavailable is not success. |
| `src/lib/trialAccount.ts` | `/api/trial/create-account` | Creates/persists workspace/user IDs for cockpit saves. |
| `src/lib/documentReview.ts` | `/api/documents/review` | Secondary prototype only; document-assisted primary flow uses `/api/analyse/document-assisted`. |
| `src/pages/PricingPage.tsx` | `/api/pricing/plans` | Backend pricing is canonical; no USD hardcoding. |
| `src/pages/RequestPilotPage.tsx` | `/api/contact` | Does not fake success when backend returns `sent:false`. |

## Success and Unavailable Detection

Valid result payload fields include:

- `verified_facts`
- `claims`
- `unknowns`
- `diligence_blockers`
- `acquisition_readiness_summary`
- `evidence_cards`
- `financial_signals`
- `company_snapshot`
- `public_source_check_records`
- `document_summary`
- `extracted_claims`
- `financial_claims`
- `customer_claims`
- `product_claims`
- `ai_claims`

Unavailable document uploads are detected from `status:"unavailable"`, `reason:"document_uploads_disabled"`, or `error_code:"document_uploads_disabled"`. The UI must show unavailable, not Analysis complete / View result.

## Static and Locked Surfaces

- AI Risk standalone page is explanatory/private beta unless opened from a target result.
- Exports is team beta/locked and should focus on IC memo, evidence register, PPT pack and diligence checklist.
- Evidence workflow page is not the primary document upload route.
- Legacy sample/demo routes must not feed real workflow results.

## Current Action List

1. Keep `/app/run` as the primary workflow.
2. Preserve free preview quota/session behavior.
3. Treat backend `status:"ok"` origination with empty targets as a clean empty state.
4. Keep Settings developer diagnostics collapsed and use Railway health when configured.
5. Keep pricing/request-pilot backend-driven and honest.
