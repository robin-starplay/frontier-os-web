# Frontier OS Design QA Gate

A new page, material page redesign or new workflow state is not complete until this checklist has been reviewed against the rendered interface.

Design QA is a human product-quality gate. Passing automated tests does not replace it.

## Page decision

Write the single decision the page helps the user make:

> Decision: ________________________________________________

If the page cannot be described as one decision, reduce or split the content before continuing.

## Required review

- [ ] Every card has enough internal padding. Default to 32px for primary cards and 24px for compact records.
- [ ] Explanatory text that does not change a decision or action has been removed.
- [ ] The page has one visually dominant primary action.
- [ ] Visual hierarchy makes the first point of attention obvious within three seconds.
- [ ] Colour is used only for workflow, evidence status, selection or material risk.
- [ ] The page answers one clear investment or workflow decision.
- [ ] The interface feels like investor software, not software explaining its implementation.
- [ ] The rendered page is credible enough to show to a senior investment professional without qualification.

Any unchecked item blocks completion.

## Evidence-first checks

- [ ] Verified facts, company claims, inferred signals, conflicts and unknowns are visually distinct.
- [ ] No unverified value uses the verified/green treatment.
- [ ] The recommendation, blockers and next action are traceable to evidence.
- [ ] Internal infrastructure, provider and execution terminology is absent.
- [ ] Empty states explain the useful recovery action without inventing data.

## Layout and interaction checks

- [ ] Body copy is readable with at least 1.6 line height.
- [ ] Interactive targets are at least 44px high and show a visible keyboard focus state.
- [ ] Cards are not nested when typography, whitespace or a divider would work.
- [ ] URLs, tables and long labels do not force horizontal scrolling.
- [ ] The page has been checked at 390, 768, 1024, 1366, 1440, 1680 and 1920px.
- [ ] Print output has no clipped content, orphan headings or mostly blank final page when the page is printable.

## Completion record

- Reviewer:
- Date:
- Routes reviewed:
- Screenshots or test evidence:
- Exceptions accepted and why:

Exceptions require an explicit explanation. “Temporary” is not sufficient without an owner and follow-up date.
