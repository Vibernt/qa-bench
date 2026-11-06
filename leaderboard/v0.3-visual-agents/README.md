# Visual-track agent runs: Claude Haiku 5.5 and Sonnet 5.5, low and high effort, on track 7.3

Run on 6 Nov 2026 with bench 0.2.0-dev, matcher `deterministic-3`, harness `harness/agents` 0.4.0 and the episode
set [`v0.3-visual-12`](../../harness/agents/sets/v0.3-visual-12.yaml), which is the whole visual track:
- **12 episodes:** 9 mixed (7 on the expense app, 2 on Swag Labs `visual_user`), 1 clean, and 2 twins with only a
  deliberate visual change (the expense restyle and the Swag Labs seasonal banner).
- **17 planted defects:** 12 visual and 5 accessibility; 9 subtle and 8 blatant; 2 known, the Swag Labs
  `visual_user` fault.
  - **The expense app's defects change only the stylesheet.** The page's text, markup and behaviour stay correct,
    so they show only on the rendered page, or to a system that measures it (geometry, computed styles).
  - **Severity follows impact.** A phone layout that hides the row actions is critical; a misaligned column is
    minor.
- **The brief** is exploratory and gives the supported devices: "current desktop browsers (1280 px and wider) and
  phones (from 360 px wide), with mouse, touch or keyboard". It never says what to look for or how to test.
- **25 natural defects** are labelled for these two apps: 15 on the expense app and 10 on Swag Labs. Each episode
  holds its app's natural defects, 165 occurrences in all.

Each configuration got the same prompt ([`prompt.md`](../../harness/agents/prompt.md)) and ran once per episode: 48
agent runs. The scripted `playwright-suite` ran on the same episodes.

| Configuration | Planted recall | Subtle | Visual | Accessibility | Severity-weighted recall | Natural bugs found | Precision | False alarms /100 ep | Screenshots looked at /ep | Tool calls /ep | Median time /ep | Est. cost (12 ep) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Haiku 5.5, high effort** | **100%** (17/17) | **9/9** | **12/12** | **5/5** | **100%** | **10 of 25** (28/165) | **98.1%** | **0** | 7.2 | 31.4 | 186 s | $0.03 |
| **Sonnet 5.5, high effort** | **100%** (17/17) | **9/9** | **12/12** | **5/5** | **100%** | 7 of 25 (13/165) | 97.4% | **0** | 7.4 | 18.1 | 75 s | $0.35 |
| Haiku 5.5, low effort | 70.6% (12/17) | 6/9 | 7/12 | 5/5 | 73.2% | 7 of 25 (12/165) | 100% | **0** | 2.8 | 14.6 | 67 s | $0.01 |
| Sonnet 5.5, low effort | 64.7% (11/17) | 3/9 | 8/12 | 3/5 | 65.9% | 2 of 25 (4/165) | 95.5% | **0** | 2.8 | 9.5 | 36 s | $0.18 |
| *`playwright-suite` (scripted)* | *11.8% (2/17)* | *0/9* | *2/12* | *0/5* | *14.6%* | *0 of 25* | *100%* | *0* | *—* | *—* | *20 s* | *$0* |

"Screenshots looked at" counts the times the agent opened an image to look at it. Saving one isn't counted. The
committed transcript audit ([`harness/agents/src/audit.ts`](../../harness/agents/src/audit.ts)) counts it, and the
report shows it as "Activity per episode". It is reported, never scored.

## What it shows
- **The scripted suite is blind to visual and accessibility faults.** It found only the Swag Labs `visual_user` fault,
  whose prices are also wrong in the page text. It missed every expense defect, because each leaves the text and
  behaviour correct. This is the gap the track was built to measure.
- **High effort finds everything.** Both high-effort configurations found all 17 planted defects, including the
  critical phone layout, the invisible sign-in error, the keyboard-only focus fault and the long-title overflow.
  Haiku high also found the most natural defects (10 of 25), at about a tenth of Sonnet high's cost.
- **Low effort misses the defects that need an action or particular data.** Most misses were subtle defects:
  - **Long-title overflow** (missed 4 times): you have to add a long title.
  - **Invisible sign-in error** (3): you have to fail a sign-in.
  - **Missing focus ring** (2): you have to use the keyboard.
  - **Misaligned amounts** (2): you have to look closely at the column.

  The blatant defects on a page's first load were found by nearly every run.
- **Agents look at the page when the brief is about it.** With supported devices in the brief, agents looked at
  screenshots 2.8 to 7.4 times per episode. In the v0.2 runs on the regression and exploration tracks, they looked
  0 to 1.8 times per episode. They also measured the page: computed styles, bounding boxes, contrast ratios and the element at a point.
  Many reports quote the CSS rule at fault. So "visual" here means *what the user sees*, found by looking or by
  measuring; reading the served stylesheet is allowed, since any tester can.
- **No false alarms on the deliberate restyle or the seasonal banner,** from any system.

## Ground truth: what changed before publishing
- **A pilot exposed a giveaway, which was then fixed.** A first run of the two low-effort configurations (24 agents,
  not published) showed agents spotting the defects as rules *appended* to the end of `/theme.css`. Each defect is
  now an in-place edit of the rule it breaks. A real regression looks like that, and `verify.ts` checks each edit
  applies exactly once. All 48 published runs used the fixed build.
- **Triage added 11 natural defects,** each confirmed on the clean build with a `verify.ts` check:

  | Label | Severity | Symptom |
  |---|---|---|
  | `expense.row-actions-unnamed` | minor | Every row's Edit and Delete controls have the same accessible name |
  | `expense.phone-rows-unlabelled` | minor | On phones the header row is hidden, so stacked values have no labels |
  | `expense.viewer-empty-actions-column` | minor | Viewers see an Actions column that is always empty |
  | `expense.no-thousands-separator` | minor | $1234.56 is shown with no thousands separator |
  | `expense.small-touch-targets` | minor | The Edit link is about 29 x 20 px on a phone, under 24 x 24 |
  | `expense.focus-ring-low-contrast` | minor | The amber focus ring is about 2.3:1 against the page, under 3:1 |
  | `expense.unbroken-title-overflows` | minor | A long title with no spaces makes the table overflow |
  | `expense.control-borders-low-contrast` | minor | Input and select borders are about 1.4:1 |
  | `swag.cart-link-not-focusable` | **major** | The header cart link is an `<a role=button>` with no href: Tab skips it, so keyboard users can't reach checkout |
  | `swag.focus-indicator-missing` | minor | Upstream sets `:focus { outline: none }` with no replacement |
  | `swag.small-tap-targets` | minor | The menu button is 20 x 20 px |

- **Five match entries for `swag.visual-user`,** for symptoms the label already described but agents reported with
  another locator: on the cart page, without a button's selector, or as a price format fault ("$13.4"). Each has its
  own `verify.ts` check.
- **Tighter patterns** keep three planted labels from claiming reports of a different, real problem: a ring with low
  contrast, a title with no spaces, and faint control borders.
- **Left unmatched, on purpose:** single, subjective layout calls on Swag Labs. These are the sort control collapsing
  to an icon at 360 px, large gaps in phone product cards, and the checkout error banner's placement.

## How it was run, and the caveats
- **Driver:** `claude-code-subagent`, the `qa-tester` subagent type (shell and file tools only). Every transcript
  confirms the served model.
- **Sealing:** the audit of all 48 transcripts found **0 references to sealed paths**. The subagents could still see
  the repository's instructions file (see [harness/agents/README.md](../../harness/agents/README.md)).
- **Triage favours these runs.** The 11 new natural defects came from these runs' own findings, so some precision
  and natural recall is earned after the fact. The planted results don't depend on triage. Future configurations are
  scored against the same, larger answer key.
- **Category scope.** The brief lists the track's categories (visual, a11y), as every track's brief does. It is
  product context, not a test plan, and it applies to every system the same way.
- **Sample size:** 12 episodes, one run each. 17/17 has a 95% interval of 82–100%, 12/17 of 47–87% and 11/17 of
  41–83%. High effort is clearly ahead of low effort, and both are far ahead of the scripted suite.
- **Cost:** an estimate from total tokens (85% cache reads, 10% input, 5% output), as in earlier rounds.

## Files
Each `<configuration>/` folder holds:
- `report.json` and `report.md`: the scorer's output, with every finding's decision and reason, and each episode's
  activity;
- `usage.json` (agents only): tokens, time, tool calls, screenshots taken and looked at, the served model and the
  audit, per episode;
- `findings/<episode>.findings.json`: the sanitised findings that were scored. Evidence paths are relative, and the
  generated passwords are redacted.
