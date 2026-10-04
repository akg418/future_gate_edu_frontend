import http from '../core/http.js';
import store from '../core/store.js';

/**
 * Authentication API client. Every call funnels the resulting identity through
 * the store, so the whole UI reacts to a session change from one place.
 */
export const authService = {
  /** Roles the signup form offers — always loaded from the backend. */
  async signupRoles() {
    const { data } = await http.get('/auth/signup-roles');
    return data;
  },

  async register(payload) {
    const { data, message } = await http.post('/auth/register', payload);
    return { ...data, message };
  },

  async login(credentials) {
    const { data } = await http.post('/auth/login', credentials);
    store.setSession({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  async logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      // The local session is cleared even if the server call fails.
      store.clearSession();
    }
  },

  /** Re-reads the identity so permission changes land without a re-login. */
  async me() {
    const { data } = await http.get('/auth/me');
    store.setUser(data);
    return data;
  },

  async updateProfile(payload) {
    const { data, message } = await http.patch('/auth/me', payload);
    store.setUser(data);
    return { user: data, message };
  },

  async changePassword(payload) {
    const { message } = await http.post('/auth/change-password', payload);
    store.clearSession();
    return message;
  },

  /** Catalogue used to label permissions in the Roles page. */
  async permissionCatalogue() {
    const { data } = await http.get('/auth/permission-catalogue');
    store.setPermissionCatalogue(data);
    return data;
  },
};

export default authService;
