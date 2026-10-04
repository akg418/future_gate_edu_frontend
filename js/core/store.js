import CONFIG from './config.js';

/**
 * Session state: the signed-in user, their permission keys and the tokens.
 *
 * A tiny publish/subscribe store rather than a framework — components subscribe
 * and re-render themselves when the identity changes (login, logout, refresh).
 */

const listeners = new Set();

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota — the app still works, just without persistence.
  }
}

const state = {
  user: readJSON(CONFIG.storageKeys.user, null),
  accessToken: localStorage.getItem(CONFIG.storageKeys.accessToken) || null,
  refreshToken: localStorage.getItem(CONFIG.storageKeys.refreshToken) || null,
  language: localStorage.getItem(CONFIG.storageKeys.language) || CONFIG.defaults.language,
  /** Permission catalogue downloaded from the backend, keyed for labelling. */
  permissionCatalogue: [],
};

function notify() {
  for (const listener of listeners) {
    try {
      listener(store.snapshot());
    } catch (error) {
      console.error('Store listener failed', error);
    }
  }
}

export const store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  snapshot() {
    return { user: state.user, isAuthenticated: Boolean(state.user), language: state.language };
  },

  get user() { return state.user; },
  get accessToken() { return state.accessToken; },
  get refreshToken() { return state.refreshToken; },
  get language() { return state.language; },
  get isAuthenticated() { return Boolean(state.user && state.accessToken); },
  get isSuperAdmin() { return Boolean(state.user?.isSuperAdmin); },
  get permissions() { return state.user?.permissions || []; },
  get permissionCatalogue() { return state.permissionCatalogue; },

  setSession({ user, accessToken, refreshToken }) {
    state.user = user || null;
    if (accessToken !== undefined) state.accessToken = accessToken;
    if (refreshToken !== undefined) state.refreshToken = refreshToken;

    writeJSON(CONFIG.storageKeys.user, state.user);
    if (state.accessToken) localStorage.setItem(CONFIG.storageKeys.accessToken, state.accessToken);
    if (state.refreshToken) localStorage.setItem(CONFIG.storageKeys.refreshToken, state.refreshToken);
    notify();
  },

  /** Refreshes only the user record (e.g. after editing the profile). */
  setUser(user) {
    state.user = user;
    writeJSON(CONFIG.storageKeys.user, user);
    notify();
  },

  setTokens({ accessToken, refreshToken }) {
    if (accessToken) {
      state.accessToken = accessToken;
      localStorage.setItem(CONFIG.storageKeys.accessToken, accessToken);
    }
    if (refreshToken) {
      state.refreshToken = refreshToken;
      localStorage.setItem(CONFIG.storageKeys.refreshToken, refreshToken);
    }
  },

  clearSession() {
    state.user = null;
    state.accessToken = null;
    state.refreshToken = null;
    localStorage.removeItem(CONFIG.storageKeys.user);
    localStorage.removeItem(CONFIG.storageKeys.accessToken);
    localStorage.removeItem(CONFIG.storageKeys.refreshToken);
    notify();
  },

  setLanguage(language) {
    state.language = language;
    localStorage.setItem(CONFIG.storageKeys.language, language);
    notify();
  },

  setPermissionCatalogue(catalogue) {
    state.permissionCatalogue = catalogue || [];
  },
};

export default store;
