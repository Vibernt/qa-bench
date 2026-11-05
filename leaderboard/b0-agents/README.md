# B0 agent runs: Claude Haiku 5.5 and Sonnet 5.5, low and high effort

Run on 5 Nov 2026 with bench 0.1.0-b0, matcher `deterministic-2`, harness `harness/agents` 0.1.0 and the
episode set [`b0-sample-10`](../../harness/agents/sets/b0-sample-10.yaml). The set has 10 episodes:
- **8 regression episodes:** 6 mixed, 1 twin and 1 clean, 4 on the expense app and 4 on Swag Labs, with 6 planted
  defects and 5 deliberate changes switched on.
- **2 noise episodes** on the-internet: 1 clean and 1 twin.

All four configurations got the same prompt ([`prompt.md`](../../harness/agents/prompt.md)), built from the
brief only. Each episode was a fresh app instance, and each agent ran once.

| Configuration | Recall (planted) | Precision | F1 | False alarms /100 ep | Unmatched /ep | Findings | Median time per episode | Tokens (10 episodes) | Est. model cost |
|---|---|---|---|---|---|---|---|---|---|
| Haiku 5.5, low effort | 100% (6/6) | 85.7% | 92.3% | 0 | 0.3 | 23 | 186 s | 0.81 M | $0.04 |
| Haiku 5.5, high effort | 100% (6/6) | 66.7% | 80.0% | 0 | 1.1 | 37 | 233 s | 1.02 M | $0.04 |
| Sonnet 5.5, low effort | 100% (6/6) | 87.5% | 93.3% | 10 | 0.1 | 16 | 53 s | 0.68 M | $0.59 |
| **Sonnet 5.5, high effort** | 100% (6/6) | 88.0% | **93.6%** | **0** | 0.3 | 25 | 118 s | 0.86 M | $0.75 |
| *`playwright-suite` (scripted), same 10 episodes* | *100% (6/6)* | *78.0%* | *87.7%* | *50* | *0.0* | *45* | *19 s* | *—* | *$0* |

Notes:
- **Severity-weighted recall** is 100% for every configuration, because every planted defect was found.
- **The scripted suite's row** is taken from its full B0 run, restricted to these 10 episodes. On the full
  17-episode regression track (`leaderboard/b0/`) it scores 100% recall, 78% precision and 41.2 false alarms per 100
  episodes. Its false alarms come from copy assertions on deliberate changes.

## What it shows
- **Every configuration found every planted defect.** On these episodes the planted bugs are easy for a capable
  agent that is given the journeys. Recall can't separate the configurations, and it can't separate them from a
  scripted suite either. That is the main limit of B0 (see "Caveats").
- **Differences are in precision, false alarms and cost.**
  - **Sonnet 5.5 high:** the best balance. It filed 25 findings, 22 matched a planted defect, and it raised no
    false alarms on deliberate changes.
  - **Sonnet 5.5 low:** fastest (median 53 s per episode) and cheapest per finding among the Sonnet runs, but it
    reported one deliberate change ("Add to basket" instead of "Add to cart") as a bug. It also tested less: it often
    skipped journeys it judged done.
  - **Haiku 5.5:** about 15 to 20 times cheaper than Sonnet for the same recall.
    - **At high effort:** it explored the most (37 findings, 229 tool calls) and found the most real bugs that
      nobody planted (below). The strict scorer counts those as unmatched, which is why its precision is lowest.
- **Deliberate changes are handled far better than by the scripted suite.** Across all four configurations there
  is one false alarm in 40 agent runs. The scripted suite raises 5 on the same 10 episodes (50 per 100), and flags 7 of
  the 11 deliberate changes on the full track.

## Real bugs no one planted
These came out of the unmatched findings. Each is being checked against the app before it becomes a labelled
natural defect (docs/HANDOFF.md, B1 step 1). Until then, the scorer counts them against precision, so systems that
explore more look worse than they are.

| App | Symptom | Reported by |
|---|---|---|
| expense-app | An amount of 99999999999999 is accepted, then `/expenses` returns 500 for every role | Haiku high (2 episodes) |
| expense-app | A form rejected by the server (e.g. a whitespace-only title) comes back blank, with no error message and the typed values lost | Haiku low, Haiku high (3), Sonnet high |
| swag-labs | The checkout item total can show an unrounded float, e.g. `$59.980000000000004` | Sonnet high |
| swag-labs | An unknown URL returns 200 and a blank page with no not-found message | Haiku high |
| swag-labs | The cart link's accessible name reads "Cart, 1 items" | Haiku high |
| the-internet | Real typos outside the `/typos` demo: "Action unsuccesful", "differant numbor" | Haiku low, Haiku high |

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
