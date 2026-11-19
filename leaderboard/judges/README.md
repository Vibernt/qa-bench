# Track 7.9: judge calibration

The [60-case source manifest](../../judge-sets/visual-v1/plan.json), [native generator/run commands](../../judge-sets/README.md)
and scorer are implemented. **No model was called.** No model-quality score or production selection is claimed.

| Model | Planned 60-case maximum USD | Precision | Recall | Twin alarms | Unsure | Measured USD/case | Qualified stage |
|---|---:|---|---|---|---|---|---|
| `claude-haiku-5-5` | 0.129024 | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured |
| `claude-sonnet-5-5` | 2.580480 | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured |
| `claude-opus-5-5` | 5.160960 | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured |

Ceilings use [Anthropic prices](https://platform.claude.com/docs/en/about-claude/pricing), checked 9 Nov 2026,
16,384 input and 1,024 output tokens/call. Configurations and evidence identities are hashed in retained runs.
Comparison reports include per-kind metrics/stages, confidence bins and paired model agreement. Suggest needs
>=95% precision on >=50 decisive high-confidence cases per kind; auto needs >=98% on >=200 and 1/20 human spot checks.
This public set has viewport siblings and insufficient per-kind cases for production qualification.

The [deterministic-check adapter](../../harness/adapters/touchstone/README.md) can produce a regular
`touchstone-checks` visual-track entry. Its real module loaded, but Chromium execution was blocked by the macOS
sandbox, so those scores are **pending**, not zero and not a synthetic leaderboard result.

After native fixture verification and orchestrator-run calibration, `qa-bench judge score` produces this section's
measured table from run records. Keep the pending status until that evidence exists.
