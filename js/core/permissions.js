import store from './store.js';
import { $$ } from './dom.js';

/**
 * Frontend permission gate.
 *
 * This mirrors the backend's rules so users are not shown controls they cannot
 * use — it is a usability layer, never a security one. Every action it hides is
 * independently rejected by the server if called directly.
 *
 * Declarative usage in any HTML partial:
 *   <button data-permission="users.delete">Delete</button>
 *   <div    data-permission-any="news.create,events.create">…</div>
 *   <a      data-auth="guest">Login</a>   <!-- shown only when signed out -->
 *   <a      data-auth="user">Profile</a>  <!-- shown only when signed in  -->
 *   <span   data-super-admin>…</span>     <!-- Super Admin only -->
 */

/** True when the current user holds every listed permission. */
export function can(...keys) {
  const required = keys.flat().filter(Boolean);
  if (!required.length) return true;
  if (store.isSuperAdmin) return true;
  if (!store.isAuthenticated) return false;
  const granted = new Set(store.permissions);
  return required.every((key) => granted.has(key));
}

/** True when the current user holds at least one of the listed permissions. */
export function canAny(...keys) {
  const required = keys.flat().filter(Boolean);
  if (!required.length) return true;
  if (store.isSuperAdmin) return true;
  if (!store.isAuthenticated) return false;
  const granted = new Set(store.permissions);
  return required.some((key) => granted.has(key));
}

const parseKeys = (value) => (value || '').split(',').map((key) => key.trim()).filter(Boolean);

/**
 * Applies every permission attribute inside `root`. Call after any render that
 * injects new markup, so freshly created nodes are gated too.
 */
export function applyPermissions(root = document) {
  for (const element of $$('[data-permission]', root)) {
    toggle(element, can(parseKeys(element.dataset.permission)));
  }

  for (const element of $$('[data-permission-any]', root)) {
    toggle(element, canAny(parseKeys(element.dataset.permissionAny)));
  }

  for (const element of $$('[data-auth]', root)) {
    const mode = element.dataset.auth;
    const visible = mode === 'guest' ? !store.isAuthenticated : store.isAuthenticated;
    toggle(element, visible);
  }

  for (const element of $$('[data-super-admin]', root)) {
    toggle(element, store.isSuperAdmin);
  }
}

/**
 * Hides rather than removes, so a later login can reveal the element without a
 * full re-render. Disabled inputs are also blocked from submitting.
 */
function toggle(element, visible) {
  element.hidden = !visible;
  element.classList.toggle('fg-hidden', !visible);
  if (element.matches('button, input, select, textarea')) element.disabled = !visible;
}

/** Human label for a permission key, from the catalogue the backend publishes. */
export function permissionLabel(key) {
  const entry = store.permissionCatalogue.find((permission) => permission.key === key);
  return entry?.label || key;
}

export default { can, canAny, applyPermissions, permissionLabel };
