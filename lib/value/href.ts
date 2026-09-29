/** Keep dev/preview links under /value; the value host uses clean root paths. */
export function valueHref(path: string, pathname = typeof window === 'undefined' ? '' : window.location.pathname) {
  return `${pathname.startsWith('/value') ? '/value' : ''}${path}` || '/';
}
