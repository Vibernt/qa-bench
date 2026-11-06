/** relabel renames visible labels; restyle is a deliberate redesign (theme.ts). Neither changes behaviour. */
export type Variant = '' | 'relabel' | 'restyle' | 'hostile';
export function variantLabels(variant: string): { title: string; add: string; save: string } {
  if (variant !== '' && variant !== 'relabel' && variant !== 'restyle' && variant !== 'hostile') throw new Error(`Unknown fixture variant: ${variant}`);
  return variant === 'relabel' ? { title: 'Expense title', add: 'New expense', save: 'Save expense' } : { title: 'Title', add: 'Add expense', save: 'Save' };
}
