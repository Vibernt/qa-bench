# touchstone-checks on the visual track, 10 Nov 2026

First native run of Touchstone's deterministic page checks (`touchstone-checks`, adapter in `harness/adapters/touchstone`) over the fixed
visual track (12 episodes incl. clean and twin), Touchstone main `3fa5d19`. No model calls; compute unmeasured.
This is a page-check entry, not a whole-product score: no visual baselines, no AI judge, no write exploration.

| Metric | Value |
|---|---|
| Recall | 17.6% (3/17) |
| Recall, accessibility | 20.0% (1/5) |
| Recall, visual | 16.7% (2/12) |
| Recall, subtle / blatant | 0.0% (0/9) / 37.5% (3/8) |
| Severity-weighted recall | 17.1% |
| Precision | 17.0% (17.92 unmatched findings per episode) |
| False alarms per 100 episodes | 0.0 |
| Natural defects found | 0/160 |
| Episodes scored | 11/12 |

Not scored: 

For comparison on the same track (`leaderboard/*-agents`): scripted Playwright suite 2/17; Claude agents at high effort 17/17.
