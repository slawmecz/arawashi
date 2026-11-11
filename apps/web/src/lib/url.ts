/** Value for the aria-current attribute of a menu link (undefined = attribute omitted). */
export type AriaCurrent = 'page' | 'true' | undefined;

/** Appends a trailing slash unless the path already ends with one. */
export function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Computes aria-current for a menu link:
 * - "page" on the exact page,
 * - "true" on one of its sub-pages (e.g. /klub/kadra/ for the /klub/ link),
 * - undefined otherwise. The home page link is only current on the home page itself.
 */
export function ariaCurrentFor(currentPath: string, href: string): AriaCurrent {
  const current = withTrailingSlash(currentPath);
  const target = withTrailingSlash(href);
  if (current === target) return 'page';
  if (target !== '/' && current.startsWith(target)) return 'true';
  return undefined;
}
