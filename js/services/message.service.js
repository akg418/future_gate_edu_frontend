import http from '../core/http.js';
import { createResourceService } from './resource.service.js';

/** Contact messages — public submission plus the admin management table. */
export const messageService = {
  ...createResourceService('/messages'),

  /** PUBLIC: the website's "Send Us A Message" form. */
  async submit(payload) {
    const { data, message } = await http.post('/messages', payload);
    return { data, message };
  },

  async statistics() {
    const { data } = await http.get('/messages/statistics');
    return data;
  },

  async changeStatus(id, status) {
    const { data, message } = await http.patch(`/messages/${id}/status`, { status });
    return { data, message };
  },

  async reply(id, replyText) {
    const { data, message } = await http.post(`/messages/${id}/reply`, { reply: replyText });
    return { data, message };
  },

  exportCSV(query = {}) {
    return http.download('/messages/export', 'FutureGate_Messages.csv', query);
  },
};

export default messageService;
