# FEDS v1 current-state audit

## Scope

Audit performed across global CSS, theme handling, shared UI primitives, navigation, status and evidence components, and the Home, Discover, Review, Pipeline and Compare surfaces.

## Findings

- Two token generations coexist: shadcn-compatible HSL variables and newer `--semantic-*` / `--surface-*` variables.
- Status colours were duplicated across badges, analysis sections and workflow components. Several components used raw Tailwind blue, amber, emerald and red values.
- The default radius was 12px and many workflow surfaces used `rounded-xl` or `rounded-2xl`, producing a softer, card-heavy visual language.
- Shadow definitions extended from near-flat to `2xl`; ordinary application surfaces sometimes used floating-surface elevation.
- Typography mixed token variables with arbitrary 10px/11px labels and page headings frequently used weight 700.
- Buttons had legacy variant names and 36px default height, while a global rule forced role-buttons to 44px.
- Tables were responsive but lacked a consistent sticky header, numeric-cell contract and density semantics.
- Status chips sometimes relied on colour and pulsing animation without a persistent icon or status label.
- Light and dark themes had similar component behaviour, but did not share a complete semantic token contract.
- Public and application navigation already shared route behaviour and a More grouping; they needed quieter surfaces and the new radius/elevation rules rather than structural replacement.
- Domain components existed in several feature files. The investment workspace module is the safest consolidation point.

## Highest-priority remediation

1. Establish one semantic token layer while retaining aliases for legacy components.
2. Standardise typography, radii, elevation, focus and reduced motion globally.
3. Migrate Button, Card/Panel, Badge, StatusChip and Table.
4. Consolidate evidence and decision primitives in the investment domain module.
5. Incrementally remove raw colour utilities and oversized radii from feature pages.

## Consolidation targets

- `SemanticBadge`, `StatusChip`, `EvidenceStatus` → one semantic status contract.
- Ad-hoc financial tables → shared Table / MetricTable.
- Generic workflow cards → Card for objects, Panel for grouped workflow content.
- Decision summaries and diligence rows → investment domain primitives.

## Later page redesign

The authentication shell, reports, IC memo, evidence workflow, registry coverage, buyer templates and older demo routes retain substantial legacy radius, shadow and raw-colour usage. They should be migrated in controlled batches; changing them in FEDS v1 would mix system work with workflow redesign.
