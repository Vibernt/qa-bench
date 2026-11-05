// Route normalisation: findings carry the URL pathname only (no origin, query or hash).

/** Pathname of a URL or path: origin, query and hash stripped, repeated slashes collapsed, trailing slash removed. */
export function normaliseRoute(url: string, base = 'http://localhost'): string {
  let path: string;
  try {
    path = new URL(url, base).pathname;
  } catch {
    path = url.split(/[?#]/)[0] ?? '';
  }
  path = path.replace(/\/{2,}/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

/** Origin (scheme://host:port) of the first target, used as the base for every path the suite visits. */
export function originOf(url: string): string {
  return new URL(url).origin;
}

/** Whether two URLs share an origin (used to keep third-party noise out of request checks). */
export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}
