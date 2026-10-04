import http from '../core/http.js';
import { createResourceService } from './resource.service.js';

/** User administration: review, activation, role assignment. */
export const userService = {
  ...createResourceService('/users'),

  async statistics() {
    const { data } = await http.get('/users/statistics');
    return data;
  },

  async activate(id) {
    const { data, message } = await http.patch(`/users/${id}/activate`);
    return { data, message };
  },

  async deactivate(id) {
    const { data, message } = await http.patch(`/users/${id}/deactivate`);
    return { data, message };
  },

  async changeRole(id, roleId) {
    const { data, message } = await http.patch(`/users/${id}/role`, { role: roleId });
    return { data, message };
  },

  async resetPassword(id, newPassword) {
    const { message } = await http.post(`/users/${id}/reset-password`, { newPassword });
    return message;
  },

  exportCSV() {
    return http.download('/users/export', 'FutureGate_Users.csv');
  },
};

export default userService;
