import http from '../core/http.js';
import { createResourceService } from './resource.service.js';

/** Roles and the permission matrix behind the Super Admin's Roles page. */
export const roleService = {
  ...createResourceService('/roles'),

  /** Full catalogue grouped for display, plus the keys this role holds. */
  async permissionsFor(roleId) {
    const { data } = await http.get(`/roles/${roleId}/permissions`);
    return data;
  },

  /** Replaces a role's entire permission set (the matrix Save button). */
  async setPermissions(roleId, permissionKeys) {
    const { data, message } = await http.put(`/roles/${roleId}/permissions`, { permissions: permissionKeys });
    return { data, message };
  },

  async grantPermissions(roleId, permissionKeys) {
    const { data, message } = await http.post(`/roles/${roleId}/permissions`, { permissions: permissionKeys });
    return { data, message };
  },

  async revokePermissions(roleId, permissionKeys) {
    const { data, message } = await http.delete(`/roles/${roleId}/permissions`, { permissions: permissionKeys });
    return { data, message };
  },

  async catalogue() {
    const { data } = await http.get('/roles/permissions/catalogue');
    return data;
  },
};

export default roleService;
