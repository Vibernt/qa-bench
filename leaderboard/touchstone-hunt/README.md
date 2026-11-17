# Touchstone hunt runs

The model-led `touchstone-hunt` adapter is separate from deterministic `touchstone-checks` runs.
See the [adapter commands and qualification limits](../../harness/adapters/touchstone-hunt/README.md).
Publish only retained, qualified run reports with policy, model, caps, cost/overhead and failed episodes disclosed.

## 16 Nov 2026: three hunt prompts on `v0.4-kinds-12` (not a qualified leaderboard entry)

Bench 0.2.0-dev, matcher `deterministic-4`, episode set
[`v0.4-kinds-12`](../../harness/agents/sets/v0.4-kinds-12.yaml): 10 exploration episodes with 2 planted defects each
(16 subtle, 4 blatant) and one trap, and 2 clean episodes carrying all four traps. Model `claude-haiku-5-5` at high
effort; at most 60 model calls and $0.45 per episode; one run per prompt. Only the prompt differs between columns.

| | `hunt-0.1` | `hunt-0.2` | `hunt-0.3` |
|---|---|---|---|
| Planted recall | 25.0% (5/20) | 40.0% (8/20) | 65.0% (13/20) |
| Subtle | 2/16 | 5/16 | 10/16 |
| Blatant | 3/4 | 3/4 | 3/4 |
| Severity-weighted recall | 17.7% | 32.3% | 62.9% |
| Precision | 40.6% | 62.5% | 85.0% |
| F1 | 31.0% | 48.8% | 73.7% |
| Trap false alarms | 7 | 0 | 0 |
| Natural bugs found | 6/175 | 0/175 | 0/175 |
| Model cost (12 episodes, all attempts) | $0.47 | $1.29 | $1.40 |
| Wall time | 52 min | 127 min | 139 min |

Disclosures:
- **The answer key changed because of these runs.** The first scoring gave 3, 4 and 9 of 20. Reading the unmatched
  findings showed correct reports the patterns dropped; six patterns were widened (`edit-drops-cents`,
  `wrong-row-action`, `long-title-truncated`, `edit-resets-category` twice, and `non-ascii-mangled` now also accepts
  `l10n`), each with the missed sentence added as a test case. The table is the re-scored result. No other system has
  been run on this set, so no other score moved.
- **Still unmatched, though a person would count them:** three reports that a filtered total does not match the rows
  shown (the key cannot tell this from `wrong-total`, which can be planted beside `total-under-filter`), and one
  "category saved as meals reopens as travel on the edit form".
- **Failed episodes, rerun once after fixes:** `exploration-024` failed for every prompt (the adapter refused a
  finding from the signed-out pass, and the hunt host could not sign in past a password box rendered as plain text);
  `exploration-029` was not started for `hunt-0.3` because the set's money cap was reached. Both were rerun and
  merged in; the failed attempts' cost is included.
- **Not comparable with the agent runs** in [`v0.2-agents`](../v0.2-agents/README.md): different episode set. The
  like-for-like baseline is the next section.
- One run per prompt, so no spread. Run reports are retained locally, not in this repository.

## 17 Nov 2026: a bare agent on the same 12 episodes

The agent configuration `claude-haiku-5.5-high` ([`harness/agents`](../../harness/agents/README.md), harness 0.4.0,
the standard [`prompt.md`](../../harness/agents/prompt.md)) on `v0.4-kinds-12`, with the same answer key as the table
above. One agent per episode, each on a fresh app instance, one run.

| | `hunt-0.3` | Bare Haiku 5.5, high effort |
|---|---|---|
| Planted recall | 65.0% (13/20) | 70.0% (14/20) |
| Subtle | 10/16 | 11/16 |
| Blatant | 3/4 | 3/4 |
| Severity-weighted recall | 62.9% | 67.7% |
| Precision | 85.0% | 71.9% |
| F1 | 73.7% | 70.9% |
| Trap false alarms | 0 | 2 |
| Natural bugs found | 0 of 15 (0/175) | 8 of 15 (31/175) |
| Findings (unmatched) | 20 (3) | 64 (16) |
| Model cost, 12 episodes | $1.40 | $0.51 |
| Time, summed over episodes | 139 min | 38 min |

What it shows: on planted defects the two are level within what one run can tell (13 and 14 of 20). The bare agent
costs about a third as much, takes about a quarter of the time and also reports real bugs nobody planted; the hunt
raises fewer false alarms and none on a trap.

Disclosures:
- **Driver deviations.** The orchestrating session had no `qa-tester` subagent type, so each agent was a
  general-purpose subagent given the `qa-tester` rules and told to read its workspace's `prompt.md`. It had more
  tools available than `qa-tester` allows; the transcripts show it used only the shell and file tools (plus two
  harness bookkeeping calls). The orchestrator's own project instructions, about an unrelated project, were visible
  to the agents; they were told to ignore them and no transcript shows them reading that project.
- **Audit:** 0 sealed-path hits in all 12 transcripts. One agent read the output file of its own background shell
  command, which is outside its workspace and not a sealed path.
- **Cost is from the provider's token counts in each transcript**, at the configuration's prices, with cache writes
  priced as plain input: 1.2 M fresh input, 0.32 M output and 23.4 M cache-read tokens. The earlier agent tables
  ([`b0-agents`](../b0-agents/README.md), [`v0.2-agents`](../v0.2-agents/README.md)) estimated cost from the final context size the completion notice reports, which
  understates it roughly tenfold; their dollar columns should not be compared with this one.
- **Correct reports the key did not match (bare agent):** the dead sign-out in `exploration-020`, filed at `/logout`
  as `security-hygiene`, and the invalid amount that returns 500 in `exploration-025`, described without the stack
  text the pattern asks for. Counted by hand the bare agent found 16 of 20 and `hunt-0.3` found 15. The key was not
  changed for these.
- **Traps by hand:** the bare agent reported the legitimate duplicate row in four episodes; the scorer counts two,
  because the other two were worded in ways the trap pattern excludes. Five of its unmatched findings say the refund
  row is formatted `$-25.00`, and four say the refund cannot be re-saved from its edit form; neither claims the
  refund itself is wrong.
- **Missed by the bare agent:** `negative-amount-accepted` and `long-title-truncated` in `exploration-023`,
  `edit-drops-cents` in `exploration-026`, `non-ascii-mangled` in `exploration-027`.
- All 12 agents ran at once on one machine. One run, so no spread.
