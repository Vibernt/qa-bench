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
    ['/expenses', 'viewer', 'functional', 'When filtering by category the total still shows the all-expenses total ($399.99) instead of the total of the visible rows.'],
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
    ['/expenses', 'editor', 'consistency', 'After an add, edit or delete the list and the Total stay on the old data for about a minute until the list catches up.'],
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
    ['/expenses', 'editor', 'functional', 'Edited amount 12.35 is saved and shown as $12.00\nExpected: The row shows the amount 12.35 that was typed and saved.\nActual: After save, the Expenses table row shows "$12.00".'],
  ],
  'expense.long-title-truncated': [
    ["/expenses", "editor", "consistency", "Saved expense title drops its last word: typed 'QA Test Crème Brûlée Ledger', listed as 'QA Test Crème Brûlée'"],
    ["/expenses", "editor", "consistency", "Saved expense title drops trailing words of the typed title\nExpected: Row titled 'Quarterly Mixed Case Test' in category office.\nActual: Row shows 'Quarterly Mixed Case' in office; the word 'Test' is gone from the title"],
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
    ["/expenses/6/edit", "editor", "consistency", "Edit form shows Printer paper as travel while the expense list shows office\nExpected: The Category field on the edit page for Printer paper shows office, the same category the expenses list shows for that row.\nActual: The Category field on /expenses/6/edit shows travel for Printer paper."],
    ['/expenses/3/edit', 'editor', 'functional', 'When editing an office expense the Category dropdown shows travel, so saving changes its category.'],
    ['/expenses/2/edit', 'editor', 'functional', 'The edit form does not preselect the current category; saving an edit of "Team lunch" without touching the select changes its category from meals to travel.'],
    ['/expenses', 'editor', 'functional', 'After editing only the amount of a meals expense, it is now listed as travel: the category resets to the first option.'],
    ['/expenses/5/edit', 'editor', 'functional', 'Category is lost on edit; the dropdown defaults to travel.'],
  ],
  'expense.phone-layout-overflow': [
    ['/expenses', 'editor', 'visual', 'On a 390 px phone the expense table is cut off on the right: only the Title column is visible and Edit/Delete cannot be reached.'],
    ['/expenses', 'viewer', 'usability', 'Mobile layout is broken: the amount and category columns are clipped and the page does not scroll horizontally.'],
    ['/expenses', 'editor', 'functional', 'At phone width the Delete and Edit buttons are off-screen, so an editor cannot edit expenses on mobile.'],
  ],
  'expense.total-covers-last-row': [
    ['/expenses', 'viewer', 'visual', 'The Total box overlaps the last row of the table, hiding the "Project dinner" expense.'],
    ['/expenses', 'viewer', 'visual', 'The last expense row is covered by the total panel; you can only see a sliver of it.'],
    ['/expenses', 'editor', 'usability', 'The total is drawn over the bottom row so its Edit and Delete buttons cannot be clicked.'],
  ],
  'expense.login-error-invisible': [
    ['/login', 'viewer', 'visual', 'After a wrong password an empty red box appears: the error text is invisible because it is the same colour as the background.'],
    ['/login', 'viewer', 'error-handling', 'Failed sign-in gives no visible reason; the alert "Invalid credentials" is in the DOM but unreadable.'],
    ['/login', 'editor', 'a11y', 'The login error message has a contrast ratio of about 1.1:1, so it cannot be read.'],
  ],
  'expense.long-title-overflows': [
    ['/expenses', 'editor', 'visual', 'A long expense title overlaps the Category column instead of wrapping.'],
    ['/expenses', 'editor', 'visual', 'Titles do not wrap: "Annual partner conference registration..." runs into the category text of the same row.'],
  ],
  'expense.low-contrast-text': [
    ['/expenses', 'viewer', 'a11y', 'The category column, the table headings and the "Signed in as" line are very light grey (contrast about 1.7:1), failing WCAG AA.'],
    ['/expenses', 'viewer', 'visual', 'Secondary text is too pale to read on the white table.'],
  ],
  'expense.focus-ring-removed': [
    ['/expenses', 'viewer', 'a11y', 'There is no visible focus indicator: tabbing through the filter and buttons shows no outline.'],
    ['/login', 'viewer', 'a11y', 'Keyboard users cannot see which field has focus; outline: none is applied everywhere.'],
  ],
  'expense.amounts-misaligned': [
    ['/expenses', 'viewer', 'visual', 'The amounts are left-aligned while the Amount heading is right-aligned, so the decimals do not line up.'],
    ['/expenses', 'viewer', 'visual', 'The Amount column looks ragged: values are not right-justified under their heading.'],
  ],
};
// Natural defects (real bugs on every build): reports from the v0.2 agent runs, lightly trimmed, plus rewordings.
const naturalSamples: Record<string, S[]> = {
  'expense.silent-delete': [
    ['/expenses', 'editor', 'usability', 'The Delete button on each expense row deletes the expense immediately on one click, with no confirmation and no undo.'],
    ['/expenses', 'editor', 'consistency', 'Save and edit show a flash confirmation ("Expense saved", "Expense updated") but deleting an expense redirects to /expenses with no confirmation message, so the user gets no feedback.'],
    ['/expenses', 'editor', 'consistency', 'After a successful add or edit the list shows a status message, but after deleting an expense the page reloads with no message.'],
    ['/expenses', 'editor', 'usability', 'Removing an expense happens without asking: there is no "are you sure" step.'],
  ],
  'expense.zero-amount-accepted': [
    ['/expenses/new', 'editor', 'functional', 'The server accepts an expense with amount 0 (POST /expenses returns 303 and the row is saved as $0.00), while negative amounts are rejected with 400.'],
    ['/expenses/new', 'editor', 'error-handling', 'A zero amount is allowed; an expense of $0.00 should be refused.'],
  ],
  'expense.no-security-headers': [
    ['/expenses', 'viewer', 'security-hygiene', 'Pages send no anti-framing or hardening headers (no X-Frame-Options or CSP frame-ancestors, no X-Content-Type-Options, no CSP).'],
    ['/login', 'viewer', 'security-hygiene', 'The app can be embedded in an iframe: clickjacking is possible because no Content-Security-Policy is sent.'],
  ],
  'expense.flash-in-url': [
    ['/expenses', 'editor', 'usability', "After a successful save the page redirects to /expenses?flash=saved and the 'Expense saved' message stays on the list after every reload."],
    ['/expenses', 'viewer', 'usability', 'Opening /expenses?flash=saved shows "Expense saved" without anything being saved: the message comes from the query string.'],
  ],
  'expense.delete-missing-id': [
    ['/expenses/999/delete', 'editor', 'error-handling', 'Deleting a non-existent expense id (POST /expenses/999/delete) redirects to /expenses as if successful instead of returning 404.'],
    ['/expenses', 'editor', 'error-handling', 'Delete of an unknown id gives no error; the app redirects as if the expense was removed.'],
  ],
  'expense.row-actions-unnamed': [
    ['/expenses', 'editor', 'a11y', "Every row's Edit link and Delete button has the same accessible name with no row context, so screen reader users cannot tell them apart."],
    ['/expenses', 'editor', 'a11y', 'All Delete buttons are named just "Delete", with no expense title or aria-label.'],
  ],
  'expense.phone-rows-unlabelled': [
    ['/expenses', 'viewer', 'a11y', 'Below 600 px the thead is hidden and table, tr and td are set to display:block, so the amount and category values have no column labels.'],
    ['/expenses', 'viewer', 'a11y', 'At 360 px the table header is hidden and the table loses its semantics for assistive technology.'],
  ],
  'expense.viewer-empty-actions-column': [
    ['/expenses', 'viewer', 'usability', "The table shows an 'Actions' column header for viewers, but every cell in that column is empty."],
  ],
  'expense.no-thousands-separator': [
    ['/expenses', 'editor', 'copy', 'Amounts of $1000 or more are shown without a thousands separator (for example "$1234.56" and "Total: $1634.55").'],
  ],
  'expense.small-touch-targets': [
    ['/expenses', 'editor', 'a11y', 'Edit links are only 29x20 px on a 360px phone layout, far below the touch target size.'],
  ],
  'expense.focus-ring-low-contrast': [
    ['/expenses', 'viewer', 'a11y', 'The focus outline (#e09400) is about 2.3:1 against the page background, below the 3:1 non-text contrast minimum.'],
  ],
  'expense.unbroken-title-overflows': [
    ['/expenses', 'editor', 'visual', 'A long title with no spaces overflows the table: at 1280 px the page scrolls horizontally.'],
  ],
  'expense.control-borders-low-contrast': [
    ['/login', 'viewer', 'a11y', 'Input borders are about 1.4:1 contrast against white, below the 3:1 non-text contrast in WCAG 1.4.11.'],
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

  it('each natural sample matches its own natural label, and no planted label', () => {
    const naturalById = new Map(natural.map((l) => [l.id, l]));
    const wrong: string[] = [];
    for (const [id, list] of Object.entries(naturalSamples)) {
      for (const [i, [route, role, category, description]] of list.entries()) {
        const f = { id: `${id}-${i}`, category, severity: 'minor', description, where: { route, role } } as unknown as Finding;
        const own = matches(f, natural);
        if (!naturalById.has(id) || !own.includes(id)) wrong.push(`${id} missed: ${description}`);
        if (own.length > 1) wrong.push(`${description} matches naturals ${own.join(' + ')}`);
        const p = matches(f, planted);
        if (p.length) wrong.push(`${description} matches planted ${p.join(', ')}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
