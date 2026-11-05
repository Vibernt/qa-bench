import { describe, expect, it } from 'vitest';
import { check } from './schemas.ts';

describe('schemas', () => {
  it('accepts the example label from BRIEF.md §6.2', () => {
    const label = {
      id: 'expense.wrong-total', app: 'expense-app', title: 'Total omits the last row', track: 'regression',
      kind: 'defect', category: 'consistency', class: 'deterministic', severity: 'major',
      where: { route: '/expenses', role: 'viewer', step: 'list' },
      switch: { env: { DEFECT: 'wrong_total' }, exclusive: 'expense-defect' },
      found_by: [{ kind: 'value', selector: '[data-testid=total]', note: 'Total omits the last row' }],
      tolerance: { route: 'exact', region_px: 48 }, split: 'public',
    };
    expect(check('label', label)).toEqual([]);
  });

  it('requires a switch on defects and changes', () => {
    const label = {
      id: 'x.y', app: 'x', title: 't', kind: 'change', category: 'copy', class: 'judged', severity: 'minor',
      where: { route: '/' }, found_by: [{ kind: 'text' }], split: 'public',
    };
    expect(check('label', label).join()).toMatch(/switch/);
  });

  it('rejects an unknown category in findings', () => {
    const findings = {
      episode_id: 'e', system: { name: 's', version: '1' },
      findings: [{ id: 'f1', where: { route: '/' }, category: 'nope', description: 'd', confidence: 0.5 }],
    };
    expect(check('findings', findings).length).toBeGreaterThan(0);
  });
});
