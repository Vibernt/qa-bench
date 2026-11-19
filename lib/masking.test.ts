import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { label } from '../scorer/test/helpers.ts';
import { maskedLabelIds } from './masking.ts';
import { check } from './schemas.ts';
import { validateRepo } from '../scripts/validate.ts';

const natural = label('expense.huge-amount-breaks-list', { app: 'expense-app', kind: 'natural' });
const raw = label('expense.raw-error', { app: 'expense-app', switch: { env: { DEFECT: 'raw_error' } } });

describe('masking declarations', () => {
  it('resolves forward and inverse declarations identically, without mutating labels', () => {
    const forward = [natural, { ...raw, masks: [natural.id] }];
    const inverse = [{ ...natural, masked_by: [raw.id] }, raw];
    const before = JSON.stringify(forward);
    for (const active of [[], [raw.id], [natural.id]]) {
      expect(maskedLabelIds(forward, active)).toEqual(maskedLabelIds(inverse, active));
    }
    expect(maskedLabelIds(forward, [raw.id])).toEqual(new Set([natural.id]));
    expect(maskedLabelIds(forward, [])).toEqual(new Set());
    expect(JSON.stringify(forward)).toBe(before);
  });

  it('supports traps and duplicate declarations, with no transitive masking', () => {
    const trap = { ...raw, kind: 'trap' as const, masks: [natural.id] };
    const target = { ...natural, masked_by: [raw.id], masks: ['expense.other'] };
    expect(maskedLabelIds([trap, target], [raw.id])).toEqual(new Set([natural.id]));
  });

  it('schema accepts masks on defects and traps, rejects duplicate/invalid ids and other kinds', () => {
    for (const kind of ['defect', 'trap'] as const) expect(check('label', { ...raw, kind, masks: [natural.id] })).toEqual([]);
    for (const masks of [[natural.id, natural.id], ['bad id']]) expect(check('label', { ...raw, masks }).length).toBeGreaterThan(0);
    expect(check('label', { ...natural, masks: [raw.id] }).length).toBeGreaterThan(0);
  });

  it('validator accepts both declarations and rejects unknown ids, cross-app targets and invalid maskers', () => {
    const root = mkdtempSync(join(tmpdir(), 'qa-bench-masking-'));
    const write = (path: string, value: unknown) => {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, JSON.stringify(value));
    };
    try {
      write('apps/expense-app/app.yaml', { app: 'expense-app', title: 'Expense', targets: [{ name: 'web', service: 'web', port: 3000, path: '/' }], roles: [] });
      write('apps/expense-app/natural/huge/label.yaml', { ...natural, masked_by: [raw.id] });
      const path = 'apps/expense-app/mutations/raw/label.yaml';
      for (const kind of ['defect', 'trap'] as const) {
        // Traps belong in their own folder.
        write(path, { ...raw, masks: [natural.id] });
        if (kind === 'trap') write('apps/expense-app/traps/trap/label.yaml', { ...raw, id: 'expense.trap', kind, masks: [natural.id] });
        expect(validateRepo(root).problems).toEqual([]);
      }
      write(path, { ...raw, masks: ['expense.unknown'] });
      expect(validateRepo(root).problems.join('\n')).toContain("masks: unknown label 'expense.unknown'");
      write(path, { ...raw, masks: [natural.id] });
      write('apps/expense-app/natural/huge/label.yaml', { ...natural, app: 'other-app' });
      expect(validateRepo(root).problems.join('\n')).toContain('masker must be a distinct defect or trap');
      write('apps/expense-app/natural/huge/label.yaml', natural);
      write(path, { ...raw, kind: 'change', masks: [natural.id] });
      expect(validateRepo(root).problems.join('\n')).toContain('masker must be a distinct defect or trap');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
