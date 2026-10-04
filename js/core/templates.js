/**
 * Loads and caches HTML partials.
 *
 * Splitting the old monolithic page into `pages/**.html` keeps the markup
 * editable on its own; this loader fetches a partial the first time a route
 * needs it and serves it from memory afterwards.
 */

const cache = new Map();
const inFlight = new Map();

export async function loadTemplate(path) {
  if (cache.has(path)) return cache.get(path);
  if (inFlight.has(path)) return inFlight.get(path);

  const promise = fetch(`pages/${path}`, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`Template "${path}" could not be loaded (HTTP ${response.status})`);
      return response.text();
    })
    .then((html) => {
      cache.set(path, html);
      inFlight.delete(path);
      return html;
    })
    .catch((error) => {
      inFlight.delete(path);
      throw error;
    });

  inFlight.set(path, promise);
  return promise;
}

/** Warms the cache for templates the user is likely to open next. */
export function prefetchTemplates(paths) {
  for (const path of paths) loadTemplate(path).catch(() => {});
}

export function clearTemplateCache() {
  cache.clear();
}
