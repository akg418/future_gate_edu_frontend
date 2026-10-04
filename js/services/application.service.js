import http from '../core/http.js';
import { createResourceService } from './resource.service.js';

/** Admission applications — public submission, tracking and admin review. */
export const applicationService = {
  ...createResourceService('/applications'),

  /** PUBLIC: JSON body for the quick form. */
  async submit(payload) {
    const { data, message } = await http.post('/applications', payload);
    return { data, message };
  },

  /** PUBLIC: multipart body for the full form, which carries document uploads. */
  async submitWithDocuments(formDataBody) {
    const { data, message } = await http.upload('/applications', formDataBody);
    return { data, message };
  },

  /** PUBLIC: status lookup by reference ID or phone number. */
  async track(reference) {
    const { data } = await http.get('/applications/track', { reference });
    return data;
  },

  async statistics() {
    const { data } = await http.get('/applications/statistics');
    return data;
  },

  async changeStatus(id, status) {
    const { data, message } = await http.patch(`/applications/${id}/status`, { status });
    return { data, message };
  },

  exportCSV(query = {}) {
    return http.download('/applications/export', 'FutureGate_Applications.csv', query);
  },
};

export default applicationService;
