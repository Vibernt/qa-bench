# Contributing

Thank you for helping. The [README](README.md) explains how the bench works. [AGENTS.md](AGENTS.md) has the
standing rules, which apply to people and coding agents alike.

## Ground rules
- **Licences before code.** Read an upstream app's LICENSE file before vendoring or pinning it, and record the
  licence in `upstream.json` and [NOTICE](NOTICE). Never publish mutations of GPL or AGPL apps.
- **Labels need proof.** Every planted defect, deliberate change, baseline and natural defect needs a check in
  `apps/<app>/verify.ts`:
  - planted defects and deliberate changes must show with their switch on and be absent on the clean build;
  - baselines and natural defects must show on the clean build.

  Never widen a label just to fit one system's findings.
- **Keep the answer key sealed.** Adapter code must never read labels, episodes, answer keys or `verify.ts`.
- **No secrets or real data.** Test accounts are generated for each episode.

## Before you open a pull request
```bash
npm run check
```
That runs lint, typecheck, contract validation and the unit tests. If you touched an app or its labels, also run:
```bash
npx tsx apps/<app>/verify.ts
```
Keep commits small, with conventional messages (`feat(scorer): …`, `fix(apps): …`, `docs: …`).

## Submitting results
Outside leaderboard entries are accepted from the public release (B5), and only with the full run record:
- `report.json`;
- the findings for every episode;
- the system name and version;
- the bench version;
- cost and time.

Scores from different bench versions aren't comparable.

## Reporting a wrong label
If you think a label is wrong (a defect that isn't real, or a symptom it misses), open an issue. Give the episode
id, the finding and the app behaviour you saw. Don't paste answer-key contents from the held-out split.
