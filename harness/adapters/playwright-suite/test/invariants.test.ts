import { describe, expect, it } from 'vitest';
import { normaliseRoute, sameOrigin } from '../src/route.ts';
import {
  checkOrderTotals, fieldFault, findTextFaults, firstUnsorted, isPriceFormat, parseMoney, quotedStrings, sortedBy, sumCents, toCents,
} from '../src/invariants.ts';

describe('normaliseRoute', () => {
  it('keeps only the pathname', () => {
    expect(normaliseRoute('http://app:3000/expenses?category=travel#x')).toBe('/expenses');
    expect(normaliseRoute('http://127.0.0.1:5173/inventory-item.html?id=4')).toBe('/inventory-item.html');
    expect(normaliseRoute('/expenses/1/edit')).toBe('/expenses/1/edit');
  });
  it('collapses slashes and drops a trailing slash, but keeps the root', () => {
    expect(normaliseRoute('http://app/add_remove_elements/')).toBe('/add_remove_elements');
    expect(normaliseRoute('http://app//a///b')).toBe('/a/b');
    expect(normaliseRoute('http://app/')).toBe('/');
    expect(normaliseRoute('')).toBe('/');
  });
  it('compares origins', () => {
    expect(sameOrigin('http://app:3000/a', 'http://app:3000/b?x')).toBe(true);
    expect(sameOrigin('http://app:3000/a', 'https://submit.backtrace.io/x')).toBe(false);
    expect(sameOrigin('not a url', 'http://app')).toBe(false);
  });
});

describe('money', () => {
  it('parses the first amount in a label', () => {
    expect(parseMoney('Item total: $29.99')).toBe(29.99);
    expect(parseMoney('Tax: $2.40')).toBe(2.4);
    expect(parseMoney('$1,234.50')).toBe(1234.5);
    expect(parseMoney('Total: $399.99')).toBe(399.99);
    expect(parseMoney('$√-1')).toBeUndefined();
    expect(parseMoney('')).toBeUndefined();
    expect(parseMoney(undefined)).toBeUndefined();
  });
  it('adds in cents without float drift', () => {
    expect(sumCents([0.1, 0.2])).toBe(30);
    expect(sumCents([29.99, 9.99, 15.99])).toBe(5597);
    expect(toCents(2.675)).toBe(268);
  });
  it('recognises a displayed price', () => {
    expect(isPriceFormat('$29.99')).toBe(true);
    expect(isPriceFormat('$1,029.99')).toBe(true);
    expect(isPriceFormat('$57')).toBe(false);
    expect(isPriceFormat('$12.3')).toBe(false);
    expect(isPriceFormat('$NaN')).toBe(false);
    expect(isPriceFormat('29.99')).toBe(false);
  });
});

describe('checkOrderTotals', () => {
  it('accepts a correct overview (8% tax, rounded)', () => {
    // 29.99 + 9.99 = 39.98; tax 3.1984 -> 3.20; total 43.18
    expect(checkOrderTotals({ prices: [29.99, 9.99], itemTotal: 39.98, tax: 3.2, total: 43.18 })).toEqual([]);
  });
  it('allows one cent of rounding slack on tax', () => {
    expect(checkOrderTotals({ prices: [15.99], itemTotal: 15.99, tax: 1.27, total: 17.26 })).toEqual([]);
  });
  it('flags an item total that is not the sum of the prices (e.g. doubled)', () => {
    const problems = checkOrderTotals({ prices: [29.99, 9.99], itemTotal: 79.96, tax: 6.4, total: 86.36 });
    expect(problems.map((p) => p.field)).toEqual(['item_total']);
    expect(problems[0]?.message).toContain('$39.98');
  });
  it('flags wrong tax and a total that is not item total plus tax', () => {
    expect(checkOrderTotals({ prices: [10], itemTotal: 10, tax: 1, total: 11 }).map((p) => p.field)).toEqual(['tax']);
    expect(checkOrderTotals({ prices: [10], itemTotal: 10, tax: 0.8, total: 10.9 }).map((p) => p.field)).toEqual(['total']);
  });
  it('flags missing figures', () => {
    expect(checkOrderTotals({ prices: [10], itemTotal: undefined, tax: undefined, total: undefined }).map((p) => p.field)).toEqual(['item_total']);
    expect(checkOrderTotals({ prices: [10], itemTotal: 10, tax: undefined, total: undefined }).map((p) => p.field)).toEqual(['tax']);
  });
});

describe('sorting', () => {
  const items = [
    { name: 'Sauce Labs Backpack', price: 29.99 },
    { name: 'Sauce Labs Bike Light', price: 9.99 },
    { name: 'Test.allTheThings() T-Shirt (Red)', price: 15.99 },
  ];
  it('checks each sort option', () => {
    expect(sortedBy('az', items)).toBe(true);
    expect(sortedBy('za', items)).toBe(false);
    expect(sortedBy('za', [...items].reverse())).toBe(true);
    expect(sortedBy('lohi', [...items].sort((a, b) => a.price - b.price))).toBe(true);
    expect(sortedBy('hilo', [...items].sort((a, b) => a.price - b.price))).toBe(false);
    expect(sortedBy('hilo', [...items].sort((a, b) => b.price - a.price))).toBe(true);
  });
  it('treats equal neighbours as sorted', () => {
    expect(firstUnsorted([1, 1, 2], (a, b) => a - b)).toBeUndefined();
    expect(firstUnsorted([2, 1], (a, b) => a - b)).toBe(1);
  });
});

describe('text faults', () => {
  it('finds leaked values and placeholders', () => {
    expect(findTextFaults('Price: $undefined').map((f) => f.id)).toEqual(['undefined']);
    expect(findTextFaults('Total NaN items').map((f) => f.id)).toEqual(['nan']);
    expect(findTextFaults('Hello {{ user.name }}').map((f) => f.id)).toEqual(['template']);
    expect(findTextFaults('Hello ${firstName}').map((f) => f.id)).toEqual(['template']);
    expect(findTextFaults('[object Object]').map((f) => f.id)).toEqual(['object']);
    expect(findTextFaults('Lorem ipsum dolor sit amet').map((f) => f.id)).toEqual(['lorem']);
  });
  it('leaves ordinary copy alone', () => {
    expect(findTextFaults('Sauce Labs Backpack carry.allTheThings() with the sleek, streamlined Sly Pack')).toEqual([]);
    expect(findTextFaults('Nan bread, undefinedness, $29.99, {single brace}')).toEqual([]);
  });
  it('checks one field', () => {
    expect(fieldFault('Sauce Labs Backpack')).toBeUndefined();
    expect(fieldFault('Test.allTheThings() T-Shirt (Red)')).toBeUndefined();
    expect(fieldFault('')).toBe('empty');
    expect(fieldFault('  ')).toBe('empty');
    expect(fieldFault('null')).toContain('placeholder');
    expect(fieldFault('product.backpack.name')).toContain('raw key');
    expect(fieldFault('A bag for undefined')).toContain('undefined');
  });
  it('reads quoted copy from journey steps', () => {
    expect(quotedStrings(['Sign in as the editor', 'Choose "Add expense", fill in title', 'Then “Save”'])).toEqual(['Add expense', 'Save']);
  });
});
