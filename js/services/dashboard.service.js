import http from '../core/http.js';

/** Admin dashboard counters and the audit trail. */
export const dashboardService = {
  async statistics() {
    const { data } = await http.get('/dashboard/statistics');
    return data;
  },

  async recentActivity() {
    const { data } = await http.get('/dashboard/activity');
    return data;
  },

  async auditLog(query = {}) {
    const { data, meta } = await http.get('/dashboard/audit-log', query);
    return { items: data || [], pagination: meta?.pagination || null };
  },
};

export default dashboardService;
