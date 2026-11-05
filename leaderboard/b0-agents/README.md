# B0 agent runs: Claude Haiku 5.5 and Sonnet 5.5, low and high effort

Run on 5 Nov 2026 with bench 0.1.0-b0, matcher `deterministic-3`, harness `harness/agents` 0.1.0 and the
episode set [`b0-sample-10`](../../harness/agents/sets/b0-sample-10.yaml). The set has 10 episodes:
- **8 regression episodes:** 6 mixed, 1 twin and 1 clean, 4 on the expense app and 4 on Swag Labs, with 6 planted
  defects and 5 deliberate changes switched on.
- **2 noise episodes** on the-internet: 1 clean and 1 twin.

All four configurations got the same prompt ([`prompt.md`](../../harness/agents/prompt.md)), built from the
brief only. Each episode was a fresh app instance, and each agent ran once.

| Configuration | Planted recall | Natural bugs found | Precision | F1 | False alarms /100 ep | Unmatched /ep | Findings | Median time per episode | Tokens (10 ep) | Est. model cost |
|---|---|---|---|---|---|---|---|---|---|---|
| Haiku 5.5, low effort | 100% (6/6) | 2 of 5 (2/20 occurrences) | 95.2% | 97.6% | 0 | 0.1 | 23 | 186 s | 0.81 M | $0.04 |
| Haiku 5.5, high effort | 100% (6/6) | **3 of 5** (6/20) | 84.8% | 91.8% | 0 | 0.5 | 37 | 233 s | 1.02 M | $0.04 |
| Sonnet 5.5, low effort | 100% (6/6) | 0 of 5 (0/20) | 87.5% | 93.3% | 10 | 0.1 | 16 | 53 s | 0.68 M | $0.59 |
| **Sonnet 5.5, high effort** | 100% (6/6) | 2 of 5 (2/20) | **96.0%** | **98.0%** | **0** | 0.1 | 25 | 118 s | 0.86 M | $0.75 |
| *`playwright-suite` (scripted), same 10 episodes* | *100% (6/6)* | *0 of 5* | *78.0%* | *87.7%* | *50* | *0.0* | *45* | *19 s* | *—* | *$0* |

Notes:
- **Matcher:** scored with `deterministic-3`.
- **Severity-weighted recall** is 100% for every configuration.
- **Natural bugs** are the 5 verified real bugs that nobody planted (below). Each is present once in every episode
  of its app, so the sample has 20 occurrences in all.
- **The scripted suite's row** is taken from its full B0 run, restricted to these 10 episodes. On the full
  17-episode regression track (`leaderboard/b0/`) it scores 100% recall, 78% precision and 41.2 false alarms per 100
  episodes. Its false alarms come from copy assertions on deliberate changes.

## What it shows
- **Every configuration found every planted defect.** On these episodes the planted bugs are easy for a capable
  agent that is given the journeys. Recall can't separate the configurations, and it can't separate them from a
  scripted suite either. That is the main limit of B0 (see "Caveats").
- **Differences are in precision, false alarms, the real bugs found beyond the plan, and cost.**
  - **Sonnet 5.5 high:** the best balance. It filed 25 findings, 22 matched a planted defect, and it raised no
    false alarms on deliberate changes.
  - **Sonnet 5.5 low:** fastest (median 53 s per episode) and cheapest per finding among the Sonnet runs, but it
    reported one deliberate change ("Add to basket" instead of "Add to cart") as a bug. It also tested less: it often
    skipped journeys it judged done.
  - **Haiku 5.5:** about 15 to 20 times cheaper than Sonnet for the same planted recall.
    - **At high effort:** it explored the most (37 findings, 229 tool calls) and found the most real bugs that
      nobody planted: 3 of the 5, including the crash on a huge amount (critical). Its precision is the lowest of the
      four, because more of its exploratory findings are still unmatched.
  - **The scripted suite** finds none of the natural bugs. It checks only what it was written to check.
- **Deliberate changes are handled far better than by the scripted suite.** Across all four configurations there
  is one false alarm in 40 agent runs. The scripted suite raises 5 on the same 10 episodes (50 per 100), and flags 7 of
  the 11 deliberate changes on the full track.

## Real bugs no one planted (now labelled)
These came from triaging the unmatched findings of these runs. Each candidate was reproduced on the clean build and
labelled as a **natural defect**, with a `verify.ts` check, so a system that finds one now gets credit
([scorer/README.md](../../scorer/README.md)).

| Label | Severity | Symptom | Found by |
|---|---|---|---|
| `expense.huge-amount-breaks-list` | critical | An amount of 99999999999999 is accepted, then `/expenses` returns 500 for every role | Haiku high |
| `expense.rejected-form-loses-input` | minor | A form rejected by the server comes back blank, with no error message and the typed values lost | Haiku low, Haiku high, Sonnet high |
| `swag.unrounded-item-total` | minor | The checkout item total can show `$59.980000000000004` | Sonnet high |
| `swag.not-found-item-page` | minor | An unknown product id shows "ITEM NOT FOUND" but still offers Add to cart | Haiku low |
| `swag.cart-count-grammar` | minor | The cart link's accessible name reads "Cart, 1 items" | Haiku high |

Two typos on the-internet ("unsuccesful", "differant numbor") were labelled as excused baselines, because that app
is noise-only.

Not labelled:
- **False positives:** two candidates (checkout fields styled as errors, a clipped login banner) didn't reproduce.
- **Our own bug:** an unknown URL returning a blank 200 page comes from the bench's own nginx fallback, not the app.

## How it was run, and the caveats
- **Driver:** `claude-code-subagent`. One Claude Code subagent per episode, with the configuration's model alias
  and effort. Every transcript confirms the served model (`claude-haiku-5-5` or `claude-sonnet-5-5`).
- **Sealing:**
  - Each agent was told to work only in its workspace outside the repository.
  - An audit of every tool input in all 40 transcripts found **0 references to sealed paths**.
  - One Haiku-high agent made two stray tool calls with empty input, a cross-session message and a docs call. Both
    failed, with no effect.
  - The subagents could still see the repository's own instructions file. A container driver with a model API key
    would close that gap (harness/agents/README.md).
- **Cost:** an estimate from total tokens, assuming 85% cache reads, 10% fresh input and 5% output. Each episode's
  `usage.json` states the range. Times are the agents' wall times, with up to 20 agents running at once on one
  machine.
- **Sample size:** 10 episodes, one run each. No variance is measured, so the differences between configurations
  are indicative only.
- **Ceiling:**
  - B0's planted defects are blatant on/off switches, and the regression briefs list the journeys to check.
  - Several of Swag Labs' faulty users are publicly documented.
  - Harder defects, exploratory briefs and natural-defect labels are the next work (docs/HANDOFF.md).

## Files
Each `<configuration>/` folder holds:
- `report.json` and `report.md`: the scorer's output, with every finding's decision and reason;
- `usage.json`: tokens, time, tool calls, the served model and the audit, per episode;
- `findings/<episode>.findings.json`: the sanitised findings that were scored.

The raw prompts, briefs and agent findings are kept in the run folders under `runs/`, which are not committed.
