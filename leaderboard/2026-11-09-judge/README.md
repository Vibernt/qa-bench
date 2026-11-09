# Track 7.9: judge calibration, 9 Nov 2026

First live run of track 7.9 (`judge-sets/visual-v1`, 60 cases: 30 problem, 30 ok, 12 deliberate-change twins), through the Anthropic
Messages API with schema-constrained JSON output (the same request shape as Touchstone's judge), adaptive thinking, 1,024 output tokens
and a 16,384-token input ceiling. Two cases (`case-002`, `case-046`) exceed the input ceiling and are recorded as not judged, as the
product judge would refuse them. One run per configuration; treat small differences as noise.

| Model | Effort | Precision | Recall | Twin false alarms | Unsure | Invalid | USD per case | Run USD |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-haiku-5-5 | high | 100.0% | 96.7% | 0/12 | 0.0% | 1 | $0.000723 | $0.0434 |
| claude-haiku-5-5 | low | 100.0% | 93.3% | 0/12 | 0.0% | 0 | $0.000629 | $0.0377 |
| claude-sonnet-5-5 | high | 100.0% | 93.3% | 0/12 | 0.0% | 0 | $0.012621 | $0.7573 |

Per kind (Haiku high): a11y 100% / 100% (16 cases), intended change 100% / 100% (22), visual defect 100% / 91.7% (22).
Every model stays at **shadow** stage: each kind has fewer than the 50 cases the suggest stage needs. Opus 5.5 was not run: Haiku already
reached 100% precision at about 1/18 of Sonnet's cost.

Findings that changed the harness on this run: Haiku 5.5 rejects the `speed` parameter (removed; standard is the default); structured
outputs reject numeric `minimum`/`maximum` (removed from the schema; the parser enforces 0..1); validation tolerances now match
Touchstone's (probabilities sum within 0.02).
