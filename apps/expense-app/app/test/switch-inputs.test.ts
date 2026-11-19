import { describe, it, expect } from 'vitest';
import { newDefects, saveInput, type NewDefect } from '../src/switches/defects.js';
import { parseDefects } from '../src/server.js';
import { parseTraps } from '../src/switches/traps.js';
const parse = (s: string) => /^\d+(\.\d{1,2})?$/.test(s.trim()) && Number.isFinite(Number(s)) ? Math.round(Number(s)*100) : undefined;
const input = (title: string, amount: string, active: NewDefect[]) => saveInput(new URLSearchParams({title,amount}), n => active.includes(n), parse);

describe('HU-G switch input boundaries (no listener)', () => {
  it('registers every new defect and rejects a misspelt defect or trap', () => {
    expect([...parseDefects(newDefects)]).toEqual([...newDefects]);
    expect(() => parseDefects('raw_errors')).toThrow('Unknown DEFECT');
    expect(() => parseTraps('refund_rows')).toThrow('Unknown TRAP');
  });
  it('limits negative acceptance to signed decimal amounts', () => {
    expect(input('Credit', '-5.25', []).amount).toBeUndefined();
    expect(input('Credit', '-5.25', ['negative_amount_accepted']).amount).toBe(-525);
    for (const value of ['--5','-5e2','-Infinity','-5.123']) expect(input('Credit', value, ['negative_amount_accepted']).amount).toBeUndefined();
  });
  it('accepts whitespace-only titles while still refusing an absent title', () => {
    expect(input('   ', '5', []).blankAccepted).toBe(false);
    expect(input('   ', '5', ['blank_title_accepted']).blankAccepted).toBe(true);
    expect(input('', '5', ['blank_title_accepted']).blankAccepted).toBe(false);
  });
  it('mangles Unicode code points and preserves ASCII and clean Unicode', () => {
    expect(input(' Café 😀 ', '5', ['non_ascii_mangled']).title).toBe('Caf? ?');
    expect(input('ASCII {x}', '5', ['non_ascii_mangled']).title).toBe('ASCII {x}');
    expect(input(' Café 😀 ', '5', []).title).toBe('Café 😀');
  });
  it('raw errors precede saves for non-numbers and amounts that already break the clean list', () => {
    for (const value of ['abc','9'.repeat(100),'99999999999999']) {
      expect(input('Amount', value, ['raw_error']).rawError).toBe(true);
      expect(input('Amount', value, []).rawError).toBe(false);
    }
    expect(input('Amount', '12.50', ['raw_error']).rawError).toBe(false);
  });
});
