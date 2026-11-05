# scorer

Deterministic matcher, metrics (BRIEF.md §9) and JSON + Markdown reports.

```
npx tsx scorer/src/cli.ts runs/<run-id> [--episodes <root>]   # writes <ep>/score.json, report.json, report.md; prints the Markdown
```

API (`scorer/src/index.ts`): `MATCHER_VERSION`, `matchFinding`, `scoreEpisode`, `aggregate`, `buildReport`,
`renderMarkdown`, `scoreRun`. `scoreRun` reads `episodes/<track>/<id>/{episode.json,answer-key.json}` (plus
`$QA_BENCH_HELDOUT_DIR` if set), throws if the answer key's sha256 differs from `answer_key_sha256`, schema-checks
`out/findings.json` (invalid → `invalid_findings`, scored with zero findings), and validates the report.
A missing `runner.json` is scored as `skipped`.

## Matching rules (`deterministic-1`)
A finding is compared with every label in the episode's answer key (which holds only active defects and changes,
plus baselines). Any one `found_by` entry may match. Per entry, the effective route, role and category are the
entry's own value, else the label's.

1. **Route.** Both sides are normalised: origin, query and hash stripped, repeated slashes collapsed, trailing slash
   removed, and a trailing `/index.html` (or `.htm`) removed, so `/index.html` ≡ `/`. `tolerance.route`:
   `exact` (default) equal; `prefix` finding route starts with label route (plain string prefix, so `/inventory`
   covers `/inventory-item.html`); `any` always. A label route of `*` matches anything.
2. **Role.** If the label has a role and `tolerance.role` is not `any`, a finding that *states* a role must equal it.
   A finding with no role still matches (adapters on single-role apps may omit it).
3. **Category.** Must equal the effective category, or one of the entry's `also_categories` (other categories a
   reasonable report of the same evidence may use, e.g. a cart not emptied after checkout is functional or
   consistency).
4. **Locator.** Selectors are compared after removing quotes and collapsing whitespace
   (`[data-test="x"]` ≡ `[data-test=x]` ≡ `[data-test='x']`); they match when one contains the other. Regions match
   when they overlap or the gap on each axis is at most `tolerance.region_px` (default 48). When both sides have a
   comparable locator and none matches, there is no match. If the finding has no locator it matches, unless
   `tolerance.require_locator`. If the label entry has no locator, or the two sides only have different kinds
   (selector vs region), the match is route-level.
5. **Score** (used to choose among several matching labels): 10 + route (exact 3, prefix 2, wildcard 1) + 1 for an
   equal stated role + 4 for a matched locator. Failed matches score 0–3 (how many of route, role, category,
   locator passed) so the closest miss can be reported.

## Decisions
Each finding gets exactly one decision, in order of preference:
active `defect` label → `true_positive` (first finding to hit it) or `duplicate` (later ones); else `change` label →
`false_alarm_change`; else `baseline` label → `excused`; else `unmatched`. Among several matching labels of the
preferred kind the highest score wins (label order breaks ties). Findings are processed in file order. A finding that
resembles an inactive mutation is simply unmatched. Every decision has a human-readable `reason`.
Episodes that are not `scored` (adapter_error, timeout, invalid_findings, skipped) have zero findings, and their
planted defects count as missed.

## Metrics
- recall = defects found / planted; precision = (true positives + duplicates) / (findings − excused), null when the
  denominator is 0; F1 from those two (null if either is null).
- `changes_flagged` counts each active change once per episode. `false_alarms_per_100_episodes` =
  changes flagged × 100 / episodes. `false_alarms_on_changes` counts findings decided `false_alarm_change`.
- `unmatched_findings`, `unmatched_per_episode`: the noise-track headline.
- Time to first detection: minimum `detected_at_s` over *true positives* (duplicates excluded); mean over episodes
  that have one.
- Cost per episode = model_usd + compute_usd + human_hours × human_rate_usd_per_hour (hours without a rate add 0 USD
  but are counted in `human_hours_total`). Totals are null when no episode reported the figure.
  `cost_per_defect_found_usd` = cost total / defects found. `repro_rate` is null (not measured in B0).
- Slices: `overall`, `by_track`, `by_category`, `by_class`, and `breakdown` (track × category × class, only for
  combinations that have a label). Time and cost fields exist only for overall and by_track; slices leave them null.
  - category: labels of that category; findings by the finding's own category.
  - class: labels of that class; findings by the class of the label they matched. Unmatched findings have no class,
    so they count against every class (conservative).
  - breakdown applies both rules within the track.

## Tests
`npx vitest run scorer`. Fixtures are in `scorer/test/fixtures/` (`*.findings.json` are checked by `npm run validate`).

## Severity
Every defect label has a severity, set by its **impact on a real user, not by its category**:

| Severity | Rubric | Weight |
|---|---|---|
| critical | Blocks a core journey for some users; loses or corrupts data; leaks access or money; an accessibility blocker (keyboard trap, unlabelled control on a required step) | 5 |
| major | Wrong result or clearly broken UI on a core journey, with a workaround; layout that breaks or hides content; misleading numbers | 3 |
| minor | Cosmetic; copy typos; edge cases off the main path; small accessibility issues with no blocker | 1 |

Metrics that use it:
- **Weighted recall:** Σ weights of the defects found ÷ Σ weights of the defects planted. Missing a critical costs five
  times as much as missing a minor.
- **Weighted F1:** the F1 of weighted recall and precision.
- **Severity agreement:** findings may state their own `severity`. Of the true positives that did, this is the share
  whose severity equals the label's, so it measures whether a system judges importance the way the ground truth
  does.

`SEVERITY_WEIGHTS` in `src/metrics.ts` holds the weights.
