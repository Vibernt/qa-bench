# v0.2 agent runs: Claude Haiku 5.5 and Sonnet 5.5, low and high effort, on the harder bench

Run on 5 Nov 2026 with bench 0.2.0-dev, matcher `deterministic-3`, harness `harness/agents` 0.3.0 and the episode
set [`v0.2-sample-12`](../../harness/agents/sets/v0.2-sample-12.yaml). The set has 12 episodes, all on the expense
app and Swag Labs:
- **6 regression episodes** (track 7.1): the brief lists the journeys.
- **6 exploration episodes** (track 7.7): the brief gives only the URL, the roles and a one-line purpose.
- **17 planted defects** across them: 10 subtle and 7 blatant, 15 novel and 2 known. The 2 known ones are Swag
  Labs' publicly documented faulty users. There are also 8 deliberate changes, and the clean and twin episodes have
  no planted defect.
- **14 natural defects:** verified real bugs that nobody planted, 7 per app. Each is present in every episode of its
  app, which makes 84 occurrences.

Each of the four configurations got the same prompt ([`prompt.md`](../../harness/agents/prompt.md)), built from the
brief only. Each episode was a fresh app instance, and each agent ran once: 48 agent runs in all. The scripted
`playwright-suite` adapter ran on the same 12 episodes as a baseline.

| Configuration | Planted recall | Subtle | Severity-weighted recall | Natural bugs found | Precision | Weighted F1 | False alarms /100 ep | Findings | Median time per episode | Tokens (12 ep) | Est. model cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Haiku 5.5, high effort** | **100%** (17/17) | **10/10** | **100%** | 5 of 14 (14/84) | 92.7% | **96.2%** | **0** | 41 | 248 s | 0.68 M | $0.03 |
| Sonnet 5.5, high effort | 88.2% (15/17) | 8/10 | 90.8% | **7 of 14** (15/84) | **95.5%** | 93.1% | **0** | 44 | 99 s | 0.40 M | $0.35 |
| Haiku 5.5, low effort | 52.9% (9/17) | 3/10 | 56.9% | 4 of 14 (4/84) | 81.8% | 67.1% | **0** | 22 | 99 s | 0.32 M | $0.01 |
| Sonnet 5.5, low effort | 35.3% (6/17) | 2/10 | 40.0% | 1 of 14 (1/84) | 73.3% | 51.8% | 8.3 | 15 | 44 s | 0.22 M | $0.19 |
| *`playwright-suite` (scripted)* | *35.3% (6/17)* | *0/10* | *40.0%* | *0 of 14* | *65.0%* | *49.5%* | *66.7* | *40* | *24 s* | *—* | *$0* |

By track (planted defects found):

| Configuration | Regression (9 defects) | Exploration (8 defects) |
|---|---|---|
| Haiku 5.5, high | 9/9 | 8/8 |
| Sonnet 5.5, high | 7/9 | 8/8 |
| Haiku 5.5, low | 5/9 | 4/8 |
| Sonnet 5.5, low | 3/9 | 3/8 |
| `playwright-suite` | 3/9 | 3/8 |

Notes:
- **Severity weights:** critical 5, major 3, minor 1. A missed critical bug costs five times a missed minor one.
- **Natural bugs:** "5 of 14 (14/84)" means 5 distinct natural labels found, 14 times over 84 occurrences.
- **Known defects:** every configuration found both, so novel-only recall is the planted recall minus them. The
  report's `by_exposure` has the split.

## What it shows
- **The harder bench separates systems; B0 didn't.** On B0 every configuration found every planted defect. Here
  planted recall ranges from 35% to 100%, and the subtle defects do most of the separating: 0 to 10 of 10.
- **Effort matters more than model size on this sample.**
  - **Haiku 5.5 at high effort** found all 17 planted defects, including all 10 subtle ones, with no false alarm.
    It cost about $0.03 for the 12 episodes, the second-cheapest run. It made the most tool calls (375) and took
    the longest per episode.
  - **Sonnet 5.5 at high effort** had the best precision (95.5%) and found the most distinct natural bugs (7 of
    14), including both of the Swag Labs checkout bugs. It missed the unescaped title (stored XSS) in both
    regression episodes that planted it, and found it in the exploratory one.
  - **Both low-effort configurations stopped early.** Sonnet low averaged 8 tool calls per episode and missed
    blatant bugs, such as the duplicate write and the 60-second stale list.
- **Agents beat the scripted suite where it matters.** The suite found no subtle defect and no natural bug, and
  raised 10 false alarms on deliberate changes. Every agent configuration raised 0 or 1.
- **Exploratory briefs aren't harder for strong agents.** Both high-effort configurations found every
  exploration-track defect. Without a checklist they exercise more of the app, and most natural bugs came from
  exploration episodes.

## Ground-truth changes made from these runs
Before publishing, the unmatched findings of all 48 runs were triaged. Each candidate was confirmed in the app
source and on the clean build, then given a `verify.ts` check (AGENTS.md rule 9). The runs were then re-scored; no
episode was re-run.

**New natural defects (9):**

| Label | Severity | Symptom | Found by |
|---|---|---|---|
| `expense.silent-delete` | minor | Delete acts on one click, with no confirmation and no message afterwards | Haiku high |
| `expense.zero-amount-accepted` | minor | An amount of 0 is saved as a $0.00 expense; negative amounts are refused | Haiku low |
| `expense.no-security-headers` | minor | No CSP, X-Frame-Options or X-Content-Type-Options, so pages can be framed | Haiku low, Haiku high |
| `expense.flash-in-url` | minor | The "Expense saved" message comes from `?flash=saved`, so it returns on every reload | Haiku low |
| `expense.delete-missing-id` | minor | Deleting an unknown id redirects as if it worked | Sonnet high |
| `swag.reset-keeps-remove-buttons` | minor | Reset App State empties the cart, but the product tiles still say Remove | Haiku low, Sonnet high |
| `swag.empty-cart-checkout` | minor | An order can be placed with an empty cart | Sonnet high |
| `swag.no-security-headers` | minor | The same missing headers, on the bench's nginx | Haiku high |
| `swag.blank-not-found-page` | minor | An unknown URL renders a blank page: upstream has no catch-all route | Sonnet high |

**Matcher fixes:**
- **Change labels now name their change.** Every entry of every deliberate-change label has a description pattern.
  Before, "Delete has no confirmation" on `/expenses` was scored as a false alarm on the relabel change, because
  the two shared a route and a category family.
- **Two planted labels accept more ways of saying their symptom:**
  - `expense.stale-state` now accepts "stays on the old data for about a minute until the list catches up";
  - `expense.total-under-filter` now accepts "the all-expenses total instead of the total of the visible rows".

  Sample descriptions in `apps/expense-app/patterns.test.ts` check that no co-active labels now clash.

**A bench bug fixed:** Swag Labs' `/runtime-config.js` held the generated test account in base64, readable by any
signed-out visitor. Three findings (Haiku low once, Haiku high twice) reported it, correctly. It now holds salted
hashes, and `verify.ts` checks the file holds no credentials. The bug is gone, so it can't be labelled, and those
three findings stay unmatched. Counted as true, they would raise Haiku low's precision to 86.4% and Haiku high's to
97.6%.

**Left unmatched, on purpose:**
- **Misdiagnosed symptoms.** Haiku low and Sonnet low reported the 60-second stale list as "not saved" or "lost", so
  they claim data loss that didn't happen. The scripted suite has three similar findings: dropped cents reported as
  "not saved", a wrong filtered total that doesn't mention the filter, and a truncated title reported as "not
  saved". A triager reading the repro steps might accept some of these. The deterministic matcher can't, and the
  planned LLM matcher would have to rule on them.
- **A finding that didn't reproduce:** Haiku low reported the filter-total bug in an episode that doesn't plant it.
- **Single, debatable reports:** weak checkout validation, missing thousands separators, a wrapped button label,
  and a cart badge left after a failed checkout under `error_user`.

## How it was run, and the caveats
- **Driver:** `claude-code-subagent`. One `qa-tester` subagent per episode, limited to shell and file tools, with
  the configuration's model and effort. Every transcript confirms the served model.
- **Sealing:** an audit of every tool input in all 48 transcripts found **0 references to sealed paths**. The
  subagents could still see the repository's own instructions file. A container driver with a model API key would
  close that gap ([harness/agents/README.md](../../harness/agents/README.md)).
- **Cost:** an estimate from total tokens, assuming 85% cache reads, 10% fresh input and 5% output. Each episode's
  `usage.json` states the range. Times are the agents' wall times, with up to 20 agents running at once on one
  machine.
- **Sample size:** 12 episodes, one run each. 95% intervals on planted recall are wide, for example:
  - 17/17 is 82–100%;
  - 15/17 is 66–97%;
  - 9/17 is 31–74%;
  - 6/17 is 17–59%.

  The high-effort configurations are clearly ahead of the low-effort ones and the suite. Haiku high and Sonnet
  high can't be told apart on this sample. Repeats on fixed sets are the next step (docs/HANDOFF.md).
- **Comparability:** the scores use the labels as of the re-score, so they can't be compared with
  [`b0-agents/`](../b0-agents/README.md), which used bench 0.1.0-b0.

## Files
Each `<configuration>/` folder holds:
- `report.json` and `report.md`: the scorer's output, with every finding's decision and reason;
- `usage.json` (agents only): tokens, time, tool calls, the served model and the audit, per episode;
- `findings/<episode>.findings.json`: the sanitised findings that were scored, with evidence paths relative to each
  agent's evidence folder.

The raw prompts, briefs, transcripts and screenshots are kept in the run folders under `runs/`, which are not
committed.
