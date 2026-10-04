import http from '../core/http.js';

/** Site settings and CMS content. */
export const settingService = {
  /** PUBLIC: the content the website renders (hero text, contacts, AI greeting). */
  async getPublic() {
    const { data } = await http.get('/settings/public');
    return data;
  },

  async getAll() {
    const { data } = await http.get('/settings');
    return data;
  },

  async getGroup(group) {
    const { data } = await http.get(`/settings/${group}`);
    return data;
  },

  async updateGroup(group, values) {
    const { data, message } = await http.put(`/settings/${group}`, { values });
    return { data, message };
  },
};

export default settingService;
