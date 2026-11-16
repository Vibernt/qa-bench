/** Opt-in HU-G save mutations. The default parser and trimming remain owned by the released server. */
export const newDefects = [
  'template_token', 'misspelled_label', 'sign_out_dead', 'wrong_row_action', 'add_link_404',
  'negative_amount_accepted', 'password_visible', 'raw_error', 'blank_title_accepted', 'non_ascii_mangled',
] as const;
export type NewDefect = typeof newDefects[number];

export function saveInput(form: URLSearchParams, has: (name: NewDefect) => boolean, parse: (value: string) => number | undefined) {
  const original = form.get('title') ?? '';
  let title = original.trim();
  if (has('non_ascii_mangled')) title = title.replace(/[^\x00-\x7F]/gu, '?');
  const value = form.get('amount') ?? '';
  const rawError = has('raw_error') && (value.length > 80 || Number(value) > Number.MAX_SAFE_INTEGER / 100 || !/^-?\d+(?:\.\d{1,2})?$/.test(value.trim()));
  const negative = has('negative_amount_accepted') && /^-\d+(?:\.\d{1,2})?$/.test(value.trim());
  const amount = negative ? parse(value.trim().slice(1)) : parse(value);
  return { title, rawError, blankAccepted: has('blank_title_accepted') && original.length > 0 && !original.trim(),
    amount: negative && amount !== undefined ? -amount : amount };
}
