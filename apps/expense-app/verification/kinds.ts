/** Native HTTP probes shared by verify.ts and the app's route tests. No browser or Docker startup here. */
export interface Client {
  get(path: string): Promise<{ status: number; html: string }>;
  post(path: string, fields: Record<string, string>): Promise<{ status: number; html: string; location: string }>;
}
const fields = (title: string, amount = '7.50') => ({ title, category: 'office', amount });
const total = (html: string): number => Number(html.match(/Total: \$(-?[\d.]+)/)?.[1]);
const titles = (html: string): string[] => [...html.matchAll(/<tr><td>(.*?)<\/td>/g)].map(m => m[1]!);
export const kindProbes: Record<string, (client: Client) => Promise<boolean>> = {
  'expense.template-token': async c => (await c.get('/expenses')).html.includes('Signed in as {{username}}'),
  'expense.misspelled-label': async c => {
    const pages = await Promise.all(['/expenses', '/expenses/new', '/expenses/2/edit'].map(p => c.get(p)));
    return pages.every(p => p.html.includes('Catagory'));
  },
  'expense.password-visible': async c => /name="password" type="text"/.test((await c.get('/login')).html),
  'expense.sign-out-dead': async c => {
    const out = await c.post('/logout', {});
    return out.status === 200 && out.html.includes('Signed in as') && (await c.get('/expenses')).status === 200;
  },
  'expense.wrong-row-action': async c => {
    const html = (await c.get('/expenses')).html;
    const links = [...html.matchAll(/href="(\/expenses\/\d+\/edit)"/g)].map(m => m[1]!);
    if (links.length < 2 || !links.every(p => p === links[0])) return false;
    const edit = (await c.get(links[1]!)).html;
    const action = edit.match(/action="(\/expenses\/\d+)"/)?.[1];
    if (!action) return false;
    await c.post(action, fields('Wrong target probe'));
    return (await c.get(links[0]!)).html.includes('Wrong target probe');
  },
  'expense.add-link-404': async c => {
    const html = (await c.get('/expenses')).html;
    const link = html.match(/href="([^"]+)">(?:Add|New) expense<\/a>/)?.[1];
    return !!link && (await c.get(link)).status === 404 && (await c.get('/expenses/new')).status === 200;
  },
  'expense.negative-amount-accepted': async c => {
    const before = total((await c.get('/expenses')).html);
    const add = await c.post('/expenses', fields('Negative probe', '-5.25'));
    const after = (await c.get('/expenses')).html;
    const edit = await c.post('/expenses/6', fields('Negative edited', '-1.25'));
    return add.status === 303 && edit.status === 303 && after.includes('<td>$-5.25</td>') && total(after) === before - 5.25 &&
      (await c.get('/expenses/6/edit')).html.includes('value="-1.25"');
  },
  'expense.raw-error': async c => {
    for (const path of ['/expenses', '/expenses/6']) for (const amount of ['nonsense', '9'.repeat(100)]) {
      const response = await c.post(path, fields('Raw probe', amount));
      if (response.status !== 500 || !response.html.includes('TypeError: invalid amount') || !response.html.includes('at saveAmount')) return false;
    }
    return true;
  },
  'expense.blank-title-accepted': async c => {
    const add = await c.post('/expenses', fields('   '));
    const edit = await c.post('/expenses/6', fields('   '));
    return add.status === 303 && edit.status === 303 && titles((await c.get('/expenses')).html).filter(t => t === '').length >= 2;
  },
  'expense.non-ascii-mangled': async c => {
    await c.post('/expenses', fields('Café ☕'));
    await c.post('/expenses/6', fields('Thé 😀'));
    await c.post('/expenses', fields('ASCII control'));
    const list = titles((await c.get('/expenses')).html);
    return list.includes('Caf? ?') && list.includes('Th? ?') && list.includes('ASCII control') && !list.includes('Café ☕');
  },
  'expense.refund-row': async c => {
    const html = (await c.get('/expenses?category=travel')).html;
    const cents = [...html.matchAll(/<td>\$(-?[\d.]+)<\/td>/g)].map(m => Math.round(Number(m[1]) * 100));
    return html.includes('Refund: conference ticket') && html.includes('$-25.00') && Math.round(total(html) * 100) === cents.reduce((a,b) => a+b,0);
  },
  'expense.braces-title': async c => (await c.get('/expenses')).html.includes('<td>Lunch {team offsite}</td>'),
  'expense.empty-category': async c => {
    const list = (await c.get('/expenses')).html;
    const empty = (await c.get('/expenses?category=training')).html;
    return list.includes('<option value="training"') && empty.includes('<tbody></tbody>') && empty.includes('Total: $0.00');
  },
  'expense.legit-duplicate': async c => {
    const html = (await c.get('/expenses')).html;
    const rows = [...html.matchAll(/<tr><td>Weekly bus pass<\/td>[\s\S]*?<\/tr>/g)].map(m => m[0]);
    return rows.length === 2 && rows.every(r => r.includes('$12.00')) && rows[0]!.includes('/103/edit') && rows[1]!.includes('/104/edit');
  },
};
export const kindSwitches: Record<string, Record<string, string>> = Object.fromEntries(Object.keys(kindProbes).map(id => {
  const name = id.slice('expense.'.length).replaceAll('-', '_');
  return [id, { [new Set(['refund_row','braces_title','empty_category','legit_duplicate']).has(name) ? 'TRAP' : 'DEFECT']: name }];
}));
export const kindCombinations = [
  ['expense.edit-drops-cents', 'expense.template-token', 'expense.braces-title'],
  ['expense.long-title-truncated', 'expense.password-visible', 'expense.refund-row'],
  ['expense.edit-resets-category', 'expense.add-link-404', 'expense.empty-category'],
  ['expense.total-under-filter', 'expense.misspelled-label', 'expense.legit-duplicate'],
];
