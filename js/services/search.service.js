import http from '../core/http.js';

/** Backs the ⌘K global search modal. */
export const searchService = {
  async global(term) {
    const { data, meta } = await http.get('/search', { q: term });
    return { results: data || [], total: meta?.total || 0, query: meta?.query || term };
  },
};

export default searchService;
