# `human` adapter

A person tests an episode from the same brief an automated system gets, and files findings in the same format.
The scorer treats them exactly like any other system's findings.

## Steps
1. **Bring the episode up** (it stays up until you take it down):
   ```bash
   npx tsx bin/qa-bench.ts up regression-004
   ```
   It prints the URL to open, the test accounts for each role, the time budget, and where the brief and your
   findings file live (`runs/<session>/<episode>/`). Everything else you may know about the episode is in
   `brief/brief.json`: journeys to try, pages, categories in scope.
2. **Test it.** Work within the budget. Use only the accounts in the brief.
3. **Write your findings** to the `out/findings.json` path it printed. Start from
   [`findings.template.json`](findings.template.json); put screenshots in `out/evidence/` and refer to them by
   file name. One finding per problem:
   - `where.route`: the URL path where you saw it (no host, no query string), e.g. `/inventory.html`;
   - `where.role`: the role you were signed in as;
   - `where.selector` (optional): the element, preferably by its `data-test` or `data-testid` attribute;
   - `category`: one of `functional`, `consistency`, `permission`, `error-handling`, `visual`, `copy`, `a11y`,
     `perf`, `usability`, `email`, `security-hygiene`, `l10n`;
   - `description`, `confidence` (0 to 1), and `repro` steps.
   Record your time (`wall_time_s`) and hours (`cost.human_hours`, plus your rate) so cost per defect can be
   computed.
4. **Take the episode down and score it:**
   ```bash
   npx tsx bin/qa-bench.ts down <session>/regression-004
   npx tsx bin/qa-bench.ts run --adapter human --episodes regression-004 --findings runs/<session>/regression-004/out/findings.json
   ```
   The report is written to `runs/<run-id>/report.md`.

## Rules
- **Don't look at the answer.** Labels (`apps/*/mutations`, `apps/*/changes`, `apps/*/baseline`), `episodes/` and
  `apps/*/verify.ts` describe what is planted. Paid baseline testers get a hosted episode URL and the brief only.
- **Report only what you saw.** Some episodes contain deliberate changes, such as a redesign or reworded copy.
  Reporting those counts as a false alarm.
- **Never use real credentials or personal data** in an episode.
