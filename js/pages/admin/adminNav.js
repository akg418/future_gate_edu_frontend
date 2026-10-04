import { adminRoutes } from '../../core/routes.js';
import { guard, currentPath } from '../../core/router.js';
import { escapeHTML, $ } from '../../core/dom.js';

/**
 * Renders the admin section tabs into `#admin-nav`.
 *
 * Only routes the current user passes `guard()` for are listed, so the panel
 * shows exactly the areas that user can actually open.
 */
export function renderAdminNav(root = document) {
  const nav = $('#admin-nav', root);
  if (!nav) return;

  const here = currentPath();
  nav.innerHTML = adminRoutes()
    .filter((route) => guard(route).allowed)
    .map((route) => {
      const active = route.path === here;
      return `<a href="#${escapeHTML(route.path)}"
                 class="px-4 py-2 rounded-xl transition ${active ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                <i class="fa-solid ${escapeHTML(route.admin.icon)}"></i> ${escapeHTML(route.admin.label)}
              </a>`;
    })
    .join('');
}

export default renderAdminNav;
