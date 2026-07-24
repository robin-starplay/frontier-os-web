# Frontier Enterprise Design System v1.0

FEDS makes Frontier calm, precise and durable without changing its identity. Hierarchy, alignment and spacing do the primary visual work; colour communicates interaction or state.

## Foundations

Semantic CSS custom properties live in `src/index.css`. Tailwind v4 exposes the primary surface and text tokens as utilities while legacy shadcn variables remain compatible.

### Colour

Use `background-primary`, `background-secondary`, `surface-primary`, `surface-secondary`, `surface-elevated`, `text-primary`, `text-secondary`, `text-muted`, `text-disabled`, `border-subtle`, `border-strong`, and the `accent-*` family.

Statuses use semantic triples:

| Meaning | Text | Background | Border |
| --- | --- | --- | --- |
| Verified / complete / positive | `--feds-success-text` | `--feds-success-bg` | `--feds-success-border` |
| Partial / conditional / warning | `--feds-warning-text` | `--feds-warning-bg` | `--feds-warning-border` |
| Blocked / failed | `--feds-danger-text` | `--feds-danger-bg` | `--feds-danger-border` |
| Unknown / inactive / not assessed | `--feds-neutral-text` | `--feds-neutral-bg` | `--feds-neutral-border` |

Blue is reserved for actions, links, selection, focus and active navigation.

### Typography

Use the `type-*` utilities: `display-xl`, `display-lg`, `heading-1` through `heading-4`, `body-lg`, `body-md`, `body-sm`, `caption`, `label`, and `data`. Financial values use `type-data`, right alignment and tabular numerals. Headings use 600–650 weight and sentence case.

### Spacing, radius and elevation

Use the 4px Tailwind spacing scale, prioritising 12–16px inside compact data components, 24–32px between groups, and 40–64px between public-page sections. Radius tokens are 2, 4, 6, 8 and 10px; full radius is reserved for genuinely pill-shaped controls. Application surfaces use no shadow or `shadow-xs`; overlays use `shadow-sm`; modals use `shadow-md`.

## Components

- **Button:** primary, secondary, tertiary, destructive and quiet. One primary action per section.
- **Card:** a discrete object. **Panel:** related content within a workflow.
- **Status:** icon, text and restrained semantic colour; never colour alone.
- **Tables:** responsive overflow, sticky headers, row dividers and `data-numeric="true"` for right-aligned tabular values.
- **EvidenceItem:** conclusion first, followed by source, page, evidence type, verification, confidence and freshness. Technical provenance is expandable.
- **InvestmentViewPanel:** recommendation, readiness, confidence, reasons, principal unknown and next action.
- **Workflow:** use shared diligence, comparison, thesis, pipeline-stage, next-action and decision-history primitives.

## Theme guidance

Light and dark mode have identical spacing, hierarchy and behaviour. Dark mode uses layered navy surfaces rather than pure black or blue glow. Do not treat either theme as the default-quality or premium experience.

## Accessibility and motion

All interactive elements require visible focus. Statuses include text or accessible labels. Tables use semantic elements. Controls remain labelled and keyboard operable. Motion uses the fast (140ms), normal (210ms) and slow (280ms) tokens and is disabled under `prefers-reduced-motion`.

## Examples

```tsx
<Button>Review opportunity</Button>
<Button variant="secondary">Cancel</Button>
<StatusChip status="Verified" variant="verified" />
<TableCell data-numeric="true">£12.4m</TableCell>
```

## Anti-patterns

- Raw hex values or colour utilities in migrated shared components.
- Blue borders around ordinary content.
- Nested cards used only for spacing.
- Multiple primary buttons in one section.
- Decorative gradients, glow, pulsing or bouncing.
- Numeric status without a text alternative.
- Charts where a compact table communicates the evidence more clearly.
