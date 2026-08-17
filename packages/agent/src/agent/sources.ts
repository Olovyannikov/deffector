import { pageLocation } from '../platform';

const ABSOLUTE_URL = /^(https?|file|webpack|chrome-extension):/;
const SOURCE_EXTENSION = /\.(m?[jt]sx?|vue|svelte)$/;
const QUERY_OR_HASH = /[?#].*$/;

/** URLs of the scripts and resources the page loaded (none outside a browser). */
function loadedUrls(): Set<string> {
  const urls = new Set<string>();
  try {
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      for (const entry of performance.getEntriesByType('resource')) urls.add(entry.name);
    }
    if (typeof document !== 'undefined') {
      for (const script of Array.from(document.scripts)) if (script.src) urls.add(script.src);
    }
  } catch {
    /* not a browser */
  }
  return urls;
}

/**
 * A source file as the page loaded it, for chrome.devtools.panels.openResource.
 * Babel gives paths relative to the project root; match them against the
 * scripts the page actually loaded, else assume the dev server serves them as is.
 */
export function resolveSourceUrl(file: string): string | null {
  if (!file) return null;
  if (ABSOLUTE_URL.test(file)) return file;
  const relativePath = file.replace(/^\.?\//, '').replace(/\?.*$/, '');
  const withoutExtension = relativePath.replace(SOURCE_EXTENSION, '');
  let sameModule: string | null = null;
  for (const url of loadedUrls()) {
    const path = url.replace(QUERY_OR_HASH, '');
    if (path.endsWith(`/${relativePath}`)) return path;
    // a compiled copy of the module (`.ts` served as `.js`)
    if (!sameModule && path.replace(SOURCE_EXTENSION, '').endsWith(`/${withoutExtension}`)) {
      sameModule = path;
    }
  }
  if (sameModule) return sameModule;
  const origin = pageLocation()?.origin;
  if (origin && origin !== 'null') return `${origin}/${relativePath}`;
  return null;
}
