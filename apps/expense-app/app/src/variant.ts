export type Variant = '' | 'relabel' | 'hostile';
export function variantLabels(variant: string): { title: string; add: string; save: string } {
  if (variant !== '' && variant !== 'relabel' && variant !== 'hostile') throw new Error(`Unknown fixture variant: ${variant}`);
  return variant === 'relabel' ? { title: 'Expense title', add: 'New expense', save: 'Save expense' } : { title: 'Title', add: 'Add expense', save: 'Save' };
}
