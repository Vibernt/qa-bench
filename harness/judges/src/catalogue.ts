import type { JudgeKind } from './types.ts';

export interface Recipe {
  id: string; app: 'expense-app' | 'swag-labs' | 'survey-site';
  group: string; kind: JudgeKind; label: 'problem' | 'ok';
  defect_id: string | null; change_id: string | null; twin_of: string | null;
  fault: string; variant: string; width: number; route: string;
}
const faults = [
  ['layout_phone_overflow', 'phone-layout-overflow'],
  ['total_covers_last_row', 'total-covers-last-row'],
  ['alert_text_invisible', 'login-error-invisible'],
  ['long_title_overflows', 'long-title-overflows'],
  ['muted_text_low_contrast', 'low-contrast-text'],
  ['focus_ring_removed', 'focus-ring-removed'],
  ['amounts_misaligned', 'amounts-misaligned'],
] as const;

/** Public calibration seed, not a held-out set. Viewport siblings share a group. */
export function recipes(): Recipe[] {
  const rows: Omit<Recipe, 'id' | 'twin_of'>[] = [];
  for (const [i, [fault, slug]] of faults.entries()) {
    const widths = ['amounts_misaligned', 'long_title_overflows'].includes(fault)
      ? [900, 1024, 1180, 1280] : [360, 390, 430, 540];
    for (const [v, width] of widths.entries()) {
      const kind = i === 4 || i === 5 ? 'a11y' : v % 2 ? 'intended-change' : 'visual-defect';
      const variant = v % 2 ? 'restyle' : '';
      const row = { app: 'expense-app' as const, group: `expense.${slug}`, kind: kind as JudgeKind,
        defect_id: `expense.${slug}`, change_id: variant ? 'expense.restyle' : null,
        fault, variant, width, route: i === 2 || i === 5 ? '/login' : '/expenses' };
      rows.push({ ...row, label: 'problem' });
      // The last group still has clean comparison images; four survey controls add app breadth instead.
      if (i < 6) rows.push({ ...row, label: 'ok', fault: '', defect_id: null });
    }
  }
  for (const width of [1024, 1280]) {
    const row = { app: 'swag-labs' as const, group: 'swag.visual-user', kind: 'visual-defect' as const,
      change_id: null, variant: '', width, route: '/inventory.html' };
    rows.push({ ...row, label: 'problem', fault: 'visual_user', defect_id: 'swag.visual-user' });
    rows.push({ ...row, label: 'ok', fault: '', defect_id: null });
  }
  for (const width of [390, 1280]) for (const variant of ['cosmetic', 'structural']) {
    rows.push({ app: 'survey-site', group: `survey.${variant}`, kind: 'intended-change', label: 'ok',
      fault: '', variant, defect_id: null, change_id: `survey.${variant}`, width, route: '/contact' });
  }
  // Stable non-label ordering; opaque IDs never expose the expected answer to a judge.
  rows.sort((a, b) => key(a).localeCompare(key(b), 'en'));
  const result: Recipe[] = rows.map((r, i) => ({ ...r, id: `case-${String(i + 1).padStart(3, '0')}`, twin_of: null }));
  for (const r of result) {
    if (r.label === 'ok' && r.app === 'expense-app' && r.variant) {
      r.twin_of = result.find(p => p.group === r.group && p.width === r.width && p.label === 'problem')!.id;
    }
  }
  return result;
}
function key(r: Omit<Recipe, 'id' | 'twin_of'>): string {
  // FNV-derived stable permutation, used only for ordering (artifact identity uses SHA-256).
  const text = JSON.stringify(r);
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16).padStart(8, '0') + text;
}
