import http from '../core/http.js';

/**
 * Factory producing a typed REST client for a backend resource.
 *
 * Every collection endpoint shares the same contract (list/get/create/update/
 * delete plus `{ data, meta.pagination }`), so one factory removes a large
 * amount of near-identical client code and keeps a new resource to a one-liner.
 *
 *   export const newsService = createResourceService('/news');
 */
export function createResourceService(basePath) {
  return {
    basePath,

    /** @returns {Promise<{items: object[], pagination: object}>} */
    async list(query = {}) {
      const { data, meta } = await http.get(basePath, query);
      return { items: data || [], pagination: meta?.pagination || null };
    },

    async get(id) {
      const { data } = await http.get(`${basePath}/${id}`);
      return data;
    },

    async create(payload) {
      const { data, message } = await http.post(basePath, payload);
      return { data, message };
    },

    async update(id, payload) {
      const { data, message } = await http.patch(`${basePath}/${id}`, payload);
      return { data, message };
    },

    async remove(id) {
      const { message } = await http.delete(`${basePath}/${id}`);
      return message;
    },

    async setPublished(id, isPublished) {
      const { data, message } = await http.patch(`${basePath}/${id}/publish`, { isPublished });
      return { data, message };
    },
  };
}

export default createResourceService;
