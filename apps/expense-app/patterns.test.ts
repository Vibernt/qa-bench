// Description patterns of the expense app's planted labels (scorer/README.md, "Description pattern"). Several labels
// share a route and category, so when two or three are active in one episode the pattern is what tells them apart.
// This checks, with the scorer's own matcher:
//   1. every B0 agent finding scored as a hit on an expense planted label still matches that label;
//   2. no finding (B0 agent findings, the scripted suite's descriptions, and the sample descriptions below) matches
//      two planted labels that can be active together (different or no `switch.exclusive` group);
//   3. each sample description matches the label it was written for.
// Ground-truth tooling, not adapter code (AGENTS.md rule 8 is about adapters).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { Finding, Label } from '../../lib/contracts.ts';
import { matchFinding } from '../../scorer/src/matcher.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const load = (kind: string): Label[] => readdirSync(join(here, kind)).map((d) => parse(readFileSync(join(here, kind, d, 'label.yaml'), 'utf8')) as Label);
const planted = load('mutations');
const natural = load('natural');
const byId = new Map(planted.map((l) => [l.id, l]));

const coActive = (a: Label, b: Label): boolean => a.id !== b.id && !(a.switch?.exclusive && a.switch.exclusive === b.switch?.exclusive);
const matches = (f: Finding, labels: Label[]): string[] => labels.filter((l) => matchFinding(f, l).ok).map((l) => l.id);
function clashes(f: Finding): string[][] {
  const hit = matches(f, planted).map((id) => byId.get(id)!);
  const out: string[][] = [];
  for (const [i, a] of hit.entries()) for (const b of hit.slice(i + 1)) if (coActive(a, b)) out.push([a.id, b.id]);
  return out;
}

// --- B0 agent findings on the expense episodes -----------------------------------------------------------------
interface Decision { finding_id: string; decision: string; label_id?: string }
interface Ep { episode_id: string; app: string; decisions: Decision[] }
const agentRoot = join(repo, 'leaderboard', 'b0-agents');
const agent: { where: string; finding: Finding; decision: Decision }[] = [];
for (const system of readdirSync(agentRoot).filter((d) => existsSync(join(agentRoot, d, 'report.json')))) {
  const report = JSON.parse(readFileSync(join(agentRoot, system, 'report.json'), 'utf8')) as { episodes: Ep[] };
  for (const ep of report.episodes.filter((e) => e.app === 'expense-app')) {
    const file = JSON.parse(readFileSync(join(agentRoot, system, 'findings', `${ep.episode_id}.findings.json`), 'utf8')) as { findings: Finding[] };
    for (const finding of file.findings) {
      const decision = ep.decisions.find((d) => d.finding_id === finding.id)!;
      agent.push({ where: `${system}/${ep.episode_id}/${finding.id}`, finding, decision });
    }
  }
}

// --- The playwright-suite adapter's descriptions on the B0 expense episodes (runs/b0-playwright-regression) --------
// `expect` is the planted label each should match now (null: none). regression-012's relabel copy finding was a
// true positive for missing-persistence under deterministic-2's category-only copy entry; it is about the renamed
// link, so it no longer matches (the relabel change claims it).
const suite: { finding: Finding; expect: string | null }[] = [
  [{ route: '/expenses/1/edit', role: 'viewer' }, 'permission', 'The viewer can reach editor-only endpoints: GET /expenses/1/edit returned 200 with the edit form; POST /expenses/1 returned 303 -> /expenses?flash=updated (expected 403)', 'expense.permission-bypass'],
  [{ route: '/expenses', role: 'editor', selector: 'a[href="/expenses/new"]' }, 'copy', 'The add control reads "New expense"; the journey calls it "Add expense"', null],
  [{ route: '/expenses', role: 'viewer', selector: 'table[aria-label="Expenses"]' }, 'functional', 'The category filter does not filter: "travel" also lists 6 row(s) of other categories (meals, office)', 'expense.ignored-filter'],
  [{ route: '/expenses', role: 'viewer', selector: '[data-testid="total"]' }, 'consistency', 'Expense total is wrong: the total shows $306.74 but the 8 listed amounts add up to $399.99', 'expense.wrong-total'],
  [{ route: '/expenses', role: 'editor', selector: '[role="status"]' }, 'functional', 'The app says "Expense updated" but the change was not saved: "Train to Pune" still has $42.50, not $43.50', 'expense.misleading-success'],
  [{ route: '/expenses', role: 'editor', selector: 'table[aria-label="Expenses"]' }, 'functional', 'Saving one new expense added 2 rows to the list', 'expense.duplicate-write'],
  [{ route: '/expenses', role: 'editor', selector: 'table[aria-label="Expenses"]' }, 'functional', 'After "Expense saved" the new expense is in no list view, not even after a reload: it was not saved', 'expense.missing-persistence'],
  [{ route: '/expenses', role: 'editor', selector: 'table[aria-label="Expenses"]' }, 'consistency', 'A saved expense is missing from the full list, even after a reload, but shows when filtering by "office": the list is stale', 'expense.stale-state'],
  [{ route: '/expenses', role: 'editor', selector: 'table[aria-label="Expenses"]' }, 'consistency', 'After "Expense updated" the list still shows $42.50 for "Train to Pune" although the record holds $43.50: the list is stale', 'expense.stale-state'],
].map(([where, category, description, expectId], i) => ({
  finding: { id: `pw-${i}`, category, severity: 'major', description, where } as unknown as Finding, expect: expectId as string | null,
}));

// --- Sample descriptions: how a reasonable tester might describe each symptom (varied wording, both orders) -------
type S = [string, string, string, string]; // route, role, category, description
const samples: Record<string, S[]> = {
  'expense.wrong-total': [
    ['/expenses', 'viewer', 'consistency', 'The sum shown under the table skips the bottom expense (Project dinner).'],
    ['/expenses', 'viewer', 'consistency', 'Total is $93.25 short of the listed amounts.'],
    ['/expenses', 'viewer', 'consistency', 'The total at the bottom is $93.25 less than the sum of the rows: the last expense is not counted.'],
    ['/expenses', 'viewer', 'functional', 'Total is off by one row; it excludes the final entry in the table.'],
    ['/expenses', 'editor', 'consistency', 'Adding the listed amounts gives $399.99, but the page total says $306.74.'],
    ['/expenses', 'viewer', 'consistency', 'The displayed total does not match the sum of the amounts shown.'],
  ],
  'expense.total-under-filter': [
    ['/expenses', 'viewer', 'consistency', 'When I filter to office the total stays the same ($399.99) instead of $37.49.'],
    ['/expenses', 'viewer', 'functional', 'Filtered view: the total counts expenses that are not shown.'],
    ['/expenses', 'viewer', 'consistency', 'With the meals filter applied the total still shows $399.99, the same total as with no filter, though the three listed rows add up to $177.25.'],
    ['/expenses', 'viewer', 'functional', 'The total ignores the category filter: it keeps summing all expenses instead of only the listed ones.'],
    ['/expenses', 'viewer', 'consistency', 'Filtering by travel lists $185.25 of expenses but the total is higher ($399.99); it includes the hidden rows from other categories.'],
    ['/expenses', 'viewer', 'consistency', 'Total does not change when a category is selected; it remains the grand total.'],
  ],
  'expense.ignored-filter': [
    ['/expenses', 'viewer', 'functional', 'Selecting the office category and clicking Apply still lists all expenses.'],
    ['/expenses', 'viewer', 'functional', 'Selecting "meals" in the category filter and applying it still lists every expense, including travel and office rows.'],
    ['/expenses', 'viewer', 'functional', 'The filter has no effect: all 8 rows are shown whichever category is chosen.'],
    ['/expenses', 'viewer', 'functional', 'Category filter is ignored; the list is never narrowed down.'],
  ],
  'expense.permission-bypass': [
    ['/expenses/1/edit', 'viewer', 'permission', 'As a viewer I could change an expense amount via the edit page URL; delete is correctly refused (403).'],
    ['/expenses/2/edit', 'viewer', 'permission', 'Although the viewer sees no Edit link, opening /expenses/2/edit directly shows the edit form, and saving it changes the expense.'],
    ['/expenses/1', 'viewer', 'permission', 'A read-only user can update an expense with a direct POST to /expenses/1; the server accepts it with 303.'],
    ['/expenses/1/edit', 'viewer', 'permission', 'Viewer is able to modify amounts by going to the edit URL; it should be refused with 403.'],
  ],
  'expense.delete-open-to-viewer': [
    ['/expenses/1/delete', 'viewer', 'permission', 'Viewer cannot edit (403 on /expenses/1/edit) but can delete via POST /expenses/1/delete.'],
    ['/expenses', 'viewer', 'permission', 'The viewer can remove an expense by posting to the delete URL even though the button is hidden.'],
    ['/expenses/3/delete', 'viewer', 'permission', 'The viewer has no Delete button, but sending POST /expenses/3/delete as the viewer succeeds (303) and the row is removed.'],
    ['/expenses', 'viewer', 'permission', 'A read-only viewer can delete expenses with a crafted request: the delete endpoint does not check the role.'],
    ['/expenses/2/delete', 'viewer', 'permission', 'Editing is correctly refused for the viewer (403), but a direct delete request from the viewer is accepted and the expense is gone from the list.'],
    ['/expenses', 'viewer', 'permission', 'Viewer: the expense disappears after removing it through POST /expenses/5/delete, instead of a 403.'],
  ],
  'expense.stale-state': [
    ['/expenses', 'editor', 'consistency', 'Changes take a while to appear in the list (cached for about a minute).'],
    ['/expenses', 'editor', 'consistency', 'After saving, the new expense only shows up in the list about a minute later; the list looks cached.'],
    ['/expenses', 'editor', 'functional', 'Edited amounts appear in the list only after 60 seconds, although the edit form already shows the new value.'],
    ['/expenses', 'editor', 'consistency', 'The list is out of date after a write and updates eventually.'],
  ],
  'expense.missing-persistence': [
    ['/expenses', 'editor', 'functional', 'The expense I added is not in the list after saving.'],
    ['/expenses', 'editor', 'functional', 'Adding an expense shows "Expense saved" but the new row never appears, even after reloading: nothing was saved.'],
    ['/expenses/new', 'editor', 'functional', 'New expenses are not persisted; the success message is shown but the expense is missing from the list.'],
    ['/expenses', 'editor', 'copy', 'The "Expense saved" confirmation is shown although no row is added.'],
  ],
  'expense.misleading-success': [
    ['/expenses/3/edit', 'editor', 'functional', 'Changing the amount on the edit page has no effect, though the app says Expense updated.'],
    ['/expenses/1/edit', 'editor', 'functional', 'Editing an expense and saving shows "Expense updated", but the list still shows the old amount and the edit form has the original values: the change is not saved.'],
    ['/expenses', 'editor', 'functional', 'Edits are silently discarded; the record is unchanged after "Expense updated".'],
    ['/expenses', 'editor', 'copy', 'The "Expense updated" message is misleading: nothing was updated.'],
  ],
  'expense.duplicate-write': [
    ['/expenses', 'editor', 'functional', 'Adding one expense results in it appearing twice in the table.'],
    ['/expenses', 'editor', 'functional', 'Saving a new expense once creates two identical rows.'],
    ['/expenses', 'editor', 'consistency', 'Each add inserts the expense twice, so the total goes up by double the amount.'],
    ['/expenses/new', 'editor', 'functional', 'One click on Save produced a duplicate entry in the list.'],
  ],
  'expense.edit-drops-cents': [
    ['/expenses/4/edit', 'editor', 'functional', 'Edited amounts lose their cents (19.99 saved as 19.00).'],
    ['/expenses/2/edit', 'editor', 'functional', 'Editing an expense to 12.50 saves it as 12.00; the cents are dropped. Adding a new expense with 12.50 keeps it.'],
    ['/expenses', 'editor', 'functional', 'After an edit the amount is rounded down to a whole number.'],
    ['/expenses/5/edit', 'editor', 'consistency', 'Updating the amount loses the decimal part: 15.75 becomes 15.00 in the list and the total.'],
  ],
  'expense.long-title-truncated': [
    ['/expenses/new', 'editor', 'functional', 'Expense titles are limited to 20 characters on save; the rest is silently dropped.'],
    ['/expenses', 'editor', 'functional', 'A long title such as "Conference registration fee" is saved as "Conference registrat": titles are cut to 20 characters without warning.'],
    ['/expenses/2/edit', 'editor', 'functional', 'Editing the name to a longer text truncates it; the end of the title is lost.'],
    ['/expenses/new', 'editor', 'functional', 'Titles over 20 chars are silently shortened when saved.'],
  ],
  'expense.title-not-escaped': [
    ['/expenses', 'viewer', 'security-hygiene', 'HTML in the expense title is not escaped in the expense table.'],
    ['/expenses', 'editor', 'security-hygiene', 'A title of <b>bold</b> is rendered as bold text in the list: titles are not HTML-escaped, so <img src=x onerror=alert(1)> runs script (stored XSS).'],
    ['/expenses', 'viewer', 'security-hygiene', 'Stored cross-site scripting: expense titles are inserted into the list as raw HTML.'],
    ['/expenses', 'editor', 'visual', 'Entering markup in the title changes how the list renders; the tags are not shown as text.'],
    ['/expenses', 'editor', 'functional', 'The list interprets the title as HTML; the edit form shows it escaped.'],
  ],
  'expense.edit-resets-category': [
    ['/expenses/3/edit', 'editor', 'functional', 'When editing an office expense the Category dropdown shows travel, so saving changes its category.'],
    ['/expenses/2/edit', 'editor', 'functional', 'The edit form does not preselect the current category; saving an edit of "Team lunch" without touching the select changes its category from meals to travel.'],
    ['/expenses', 'editor', 'functional', 'After editing only the amount of a meals expense, it is now listed as travel: the category resets to the first option.'],
    ['/expenses/5/edit', 'editor', 'functional', 'Category is lost on edit; the dropdown defaults to travel.'],
  ],
};
const sampleFindings = Object.entries(samples).flatMap(([id, list]) => list.map(([route, role, category, description], i) => ({
  id, finding: { id: `${id}-${i}`, category, severity: 'major', description, where: { route, role } } as unknown as Finding,
})));

describe('expense planted labels', () => {
  it('each planted label has a description pattern on every found_by entry', () => {
    for (const l of planted) for (const e of l.found_by) expect(e.description_pattern, l.id).toBeTruthy();
  });

  it('B0 agent hits on expense planted labels still match the same label', () => {
    const hits = agent.filter((a) => a.decision.decision === 'true_positive' && byId.has(a.decision.label_id ?? ''));
    expect(hits.length).toBeGreaterThan(0);
    const lost = hits.filter((a) => !matchFinding(a.finding, byId.get(a.decision.label_id!)!).ok).map((a) => `${a.where} ${a.decision.label_id}`);
    expect(lost).toEqual([]);
  });

  it('the scripted suite descriptions match the expected label only', () => {
    for (const s of suite) {
      const got = matches(s.finding, planted);
      expect(got, s.finding.description).toEqual(s.expect ? [s.expect] : []);
    }
  });

  it('each sample description matches its own label', () => {
    const wrong = sampleFindings.filter((s) => !matchFinding(s.finding, byId.get(s.id)!).ok).map((s) => `${s.id}: ${s.finding.description}`);
    expect(wrong).toEqual([]);
  });

  it('no finding matches two planted labels that can be active together', () => {
    const all = [...agent.map((a) => ({ where: a.where, finding: a.finding })), ...suite.map((s) => ({ where: s.finding.id, finding: s.finding })),
      ...sampleFindings.map((s) => ({ where: s.finding.id, finding: s.finding }))];
    const bad = all.flatMap((x) => clashes(x.finding).map((pair) => `${x.where}: ${pair.join(' + ')}`));
    expect(bad).toEqual([]);
  });

  it('sample descriptions of planted symptoms do not match a natural label', () => {
    const bad = sampleFindings.flatMap((s) => matches(s.finding, natural).map((n) => `${s.finding.id}: ${n}`));
    expect(bad).toEqual([]);
  });
});
