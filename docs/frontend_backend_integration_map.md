# Frontend Backend Integration Map

Last updated: 2026-07-01

Frontend repo: `/Users/rb/frontier-os-web`  
Backend repo: `/Users/rb/ai-agent-test`  
Required env var: `VITE_FRONTIER_API_BASE_URL=https://web-production-0224c.up.railway.app`

## App Shape

| Item | Value |
| --- | --- |
| Framework | Vite React, TypeScript, Wouter routing |
| Package manager | npm (`package-lock.json`) |
| Dev command | `npm run dev` |
| Build command | `npm run build` |
| Output directory | `dist` |
| API base config | `src/lib/frontierApi.ts`, `src/lib/documentReview.ts`, `src/lib/trialAccount.ts`; Vite proxy in `vite.config.ts` |
| Auth | Clerk optional. Missing `VITE_CLERK_PUBLISHABLE_KEY` uses local private-beta workspace flow via backend trial account endpoint. |

## Routing Structure

Primary app routes live in `src/components/AppShell.tsx`:

| Route | Component | Backend usage | Status |
| --- | --- | --- | --- |
| `/app/run` | `src/pages/AnalysisSetup.tsx` | `POST /api/analyse/url`; optional cockpit save | `wired_and_rendering` |
| `/app/compare` | `src/pages/CompareTargetsPage.tsx` | `POST /api/analyse/compare`; optional cockpit save | `wired_no_sample_fallback` |
| `/app/origination` | `src/pages/OriginationPage.tsx` | `POST /api/origination/thesis` | `private_beta_reference_universe_or_clean_unavailable` |
| `/app/cockpit` | `src/pages/DealCockpitPage.tsx` | `GET /api/cockpit/summary`, `GET /api/cockpit/runs`, `POST /api/cockpit/decision`; local fallback | `partially_wired` |
| `/app/evidence` | `src/pages/EvidenceWorkflowPage.tsx` | Mostly static; document panel is separate component | `static_should_lock_or_wire` |
| `/app/ai-risk` | `src/pages/AIDisruptionPage.tsx` | Static/private beta sample content | `private_beta_locked` |
| `/app/exports` | `src/pages/ExportsPage.tsx` | No live export endpoint wired | `private_beta_locked` |
| `/app/settings` | `src/pages/SettingsPage.tsx` | Currently checks `/api/healthz`, not canonical backend helper | `needs_cleanup` |

Public/legacy routes live in `src/App.tsx`. Many marketing pages are static and acceptable as public website content. Legacy analysis pages (`LiveWorkflow`, `ResultsPreview`, `ICMemo`, `ReportsPage`) should not be used for the reviewer wedge unless rewired to backend results.

## API Client Map

| Frontend file | Endpoint(s) | Notes |
| --- | --- | --- |
| `src/lib/frontierApi.ts` | `POST /api/analyse/url`, `POST /api/analyse/compare`, cockpit endpoints, legacy `/analysis` helpers, `/health` | URL analysis and compare do not fabricate sample data after backend failures. Legacy `/analysis` helpers should stay out of default reviewer path. |
| `src/lib/documentReview.ts` | `POST /api/documents/review` | Multipart PDF prototype. Requires non-confidential/approved file in UI. |
| `src/lib/trialAccount.ts` | `POST /api/trial/create-account`, optional `/api/workspace/session` | Workspace session endpoint is referenced but not present in current backend inventory; trial creation is live. |
| `src/pages/PricingPage.tsx` | `GET /api/pricing/plans` | Backend canonical pricing. Fallback remains GBP-safe. |
| `src/pages/OriginationPage.tsx` | `POST /api/origination/thesis` | Renders backend targets/warnings/limitations only. If hosted route is unavailable, shows clean private-beta unavailable state. |
| `src/components/BackendStatusBadge.tsx` | `/health` through helper | Displays backend connectivity. |

## Product Surface Status

| Surface | Frontend file(s) | Data source | Status | Required rule |
| --- | --- | --- | --- | --- |
| Run analysis | `AnalysisSetup.tsx`, `frontierApi.ts`, `src/data/scenarios.ts` | Real backend URL analysis | `fully_wired_for_public_preview` | Default must not send `quality_first`; progress step 1 says `Preparing public-source preview`; no sample fallback. |
| Public Evidence Pack | `AnalysisSetup.tsx`, `evidenceUtils.ts` | Backend response fields | `wired` | Render verified facts, claims, signals, unknowns, blockers, questions, documents. No raw objects. |
| Compare | `CompareTargetsPage.tsx`, `frontierApi.ts` | Backend compare endpoint | `patched` | Starts empty. Backend response or error only. No Cerillion/Checkit placeholder comparison. |
| Origination | `OriginationPage.tsx` | Backend origination thesis endpoint when enabled | `patched_private_beta_reference_universe` | No illustrative main-flow targets. Treat output as public signals only. Show deterministic reference-universe warning. |
| Document review | `DocumentReviewPanel.tsx`, `documentReview.ts` | Backend document review endpoint | `wired_component` | Non-confidential PDF only. Document-derived items are claims unless externally verified. App evidence route still needs placement decision. |
| Cockpit | `DealCockpitPage.tsx`, `runHistory.ts`, `frontierApi.ts` | Backend cockpit plus local storage | `partial` | Avoid example cockpit as main content when real runs exist. Actions should be target-specific. |
| Pricing | `PricingPage.tsx` | Backend pricing plans | `wired` | No USD or `$99`; Starter/Growth uses backend CTA URL. |
| Evidence workflow page | `EvidenceWorkflowPage.tsx` | Static/product copy | `static` | Should be locked/private beta or replaced with live document/evidence components. |
| AI Risk page | `AIDisruptionPage.tsx`, AI components | Static/private beta sample data | `private_beta_locked` | Do not imply target-specific live AI research unless backed by run response. |
| Exports | `ExportsPage.tsx` | Static/private beta locked | `locked` | No generated export unless backend endpoint is wired. |
| Settings | `SettingsPage.tsx` | Local env and health check | `needs_cleanup` | Should call `/api/health` or `/health`, not `/api/healthz`. |

## Trust-Risk Findings

| Risk | Current status |
| --- | --- |
| Fake compare preview | Removed from main form. Compare now requires user targets. |
| Compare fallback | Removed from API client. Backend errors show explicit error state. |
| Origination illustrative targets | Removed from main flow and source constants. |
| Default run quality-first wording | Neutral stages define step 1 as `Preparing public-source preview`. |
| Sample URL analysis fallback | URL analysis client throws clear errors and does not substitute sample results. |
| Pricing USD | Pricing page uses backend plans; fallback is GBP-safe. |
| Evidence verification | Rendering utilities require source metadata for verified status. |

## Recommended Next Frontend Fixes

1. Wire `/app/evidence` directly to `DocumentReviewPanel` or a live evidence-run browser; otherwise present it as locked/private beta.
2. Remove or clearly lock legacy public routes that show static workflow/result/memo/report examples.
3. Update `SettingsPage.tsx` health check to use `getBackendBaseUrl()` with `/api/health` or `/health`.
4. Make cockpit empty state prioritize real backend/local runs and move any example preview below a clear sample label.
5. Add a small frontend smoke script that runs the trust-copy scanner against `src`.
