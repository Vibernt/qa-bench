import { existsSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve, isAbsolute } from 'node:path';
/** Resolve existing ancestors too, so a symlink cannot redirect output into the operator checkout. */
export function assertOutputOutsideRoot(out: string, root: string): void {
  let ancestor = resolve(out);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actual = resolve(realpathSync(ancestor), relative(ancestor, resolve(out)));
  const rel = relative(realpathSync(root), actual);
  if (!rel || (!rel.startsWith('..' + '/') && rel !== '..' && !isAbsolute(rel))) throw new Error('Output must be outside the read-only Touchstone checkout');
}
