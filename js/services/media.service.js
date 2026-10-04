import http from '../core/http.js';
import { createResourceService } from './resource.service.js';

/** Media library — uploads land on the server, never only in the browser. */
export const mediaService = {
  ...createResourceService('/media'),

  /**
   * Uploads one file and returns its stored record, including the public `url`
   * to reference from content (news cover, gallery photo, teacher portrait).
   */
  async upload(file, context = 'general') {
    const body = new FormData();
    body.append('file', file);
    body.append('context', context);
    const { data, message } = await http.upload('/media', body);
    return { data, message };
  },

  async uploadMany(files, context = 'general') {
    const body = new FormData();
    for (const file of files) body.append('files', file);
    body.append('context', context);
    const { data, message } = await http.upload('/media/bulk', body);
    return { data, message };
  },
};

export default mediaService;
