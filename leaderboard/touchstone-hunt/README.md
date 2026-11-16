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
- **Not comparable with the agent runs** in [`v0.2-agents`](../v0.2-agents/README.md): different episode set. No
  bare agent has been run on `v0.4-kinds-12`.
- One run per prompt, so no spread. Run reports are retained locally, not in this repository.
