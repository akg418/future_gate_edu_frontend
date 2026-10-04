import { navRoutes, adminRoutes } from '../core/routes.js';
import { guard, navigate, currentPath, onAfterNavigate } from '../core/router.js';
import { escapeHTML, $, initials } from '../core/dom.js';
import { t, setLanguage } from '../core/i18n.js';
import { applyPermissions } from '../core/permissions.js';
import store from '../core/store.js';
import { authService } from '../services/index.js';
import notify from './toast.js';
import { confirmDialog } from './modal.js';

/**
 * Renders the chrome around the routed page: navigation, the account menu, the
 * admin sidebar and the language switcher.
 *
 * Navigation is derived from the route table and filtered through the same
 * `guard()` the router uses, so a link is never shown for a page the user would
 * be bounced out of.
 */

function navLinkMarkup(route, { mobile = false } = {}) {
  const active = currentPath() === route.path;
  const label = route.nav.i18n ? t(route.nav.i18n, route.nav.label) : route.nav.label;
  const i18nAttr = route.nav.i18n ? ` data-i18n="${escapeHTML(route.nav.i18n)}"` : '';

  if (mobile) {
    return `<a href="#${escapeHTML(route.path)}" data-mobile-link
              class="block w-full text-left rtl:text-right py-2 border-b border-slate-100 ${active ? 'text-brand-blue font-bold' : 'text-slate-700'}"${i18nAttr}>${escapeHTML(label)}</a>`;
  }

  const badge = route.nav.badge
    ? `<span class="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8px] px-1.5 py-0.2 rounded-full font-bold">${escapeHTML(route.nav.badge)}</span>`
    : '';

  return `<a href="#${escapeHTML(route.path)}"
             class="nav-link ${active ? 'text-brand-blue' : ''} hover:text-brand-blue transition py-1 ${badge ? 'relative' : ''} focus-ring rounded"${i18nAttr}>${escapeHTML(label)}${badge}</a>`;
}

/** Rebuilds the desktop nav and the mobile drawer for the current identity. */
export function renderNavigation() {
  const allowed = navRoutes().filter((route) => guard(route).allowed);

  const desktop = $('#main-nav');
  if (desktop) desktop.innerHTML = allowed.map((route) => navLinkMarkup(route)).join('');

  const mobile = $('#mobile-menu');
  if (mobile) {
    const adminLinks = adminRoutes().filter((route) => guard(route).allowed);
    mobile.innerHTML = `
      ${allowed.map((route) => navLinkMarkup(route, { mobile: true })).join('')}
      ${
        adminLinks.length
          ? `<div class="pt-3 mt-1 border-t border-slate-200">
               <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Administration</p>
               ${adminLinks
                 .map(
                   (route) => `<a href="#${escapeHTML(route.path)}" data-mobile-link class="block w-full text-left rtl:text-right py-2 text-slate-700 border-b border-slate-100">
                     <i class="fa-solid ${escapeHTML(route.admin.icon)} text-brand-gold w-4"></i> ${escapeHTML(route.admin.label)}</a>`,
                 )
                 .join('')}
             </div>`
          : ''
      }
      ${
        store.isAuthenticated
          ? `<button data-logout class="block w-full text-left rtl:text-right py-2 text-rose-600 font-bold"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>`
          : `<a href="#/login" data-mobile-link class="block w-full text-left rtl:text-right py-2 text-amber-600 font-bold"><i class="fa-solid fa-lock"></i> Sign In</a>`
      }`;

    for (const link of mobile.querySelectorAll('[data-mobile-link]')) {
      link.addEventListener('click', () => closeMobileMenu());
    }
    mobile.querySelector('[data-logout]')?.addEventListener('click', () => logout());
  }
}

/** Renders the signed-out or signed-in area in the top utility bar. */
export function renderAccountArea() {
  const area = $('#account-area');
  if (!area) return;

  if (!store.isAuthenticated) {
    area.innerHTML = `
      <a href="#/login" class="hover:text-brand-gold transition text-xs bg-blue-900/60 hover:bg-blue-800 px-2.5 py-0.5 rounded border border-blue-700/50 flex items-center gap-1">
        <i class="fa-solid fa-user-gear text-brand-gold"></i>
        <span data-i18n="topbarAdmin">LOG IN</span>
      </a>
      <a href="#/signup" class="hidden sm:flex hover:text-brand-gold transition text-xs px-2 py-0.5 items-center gap-1">
        <i class="fa-solid fa-user-plus text-brand-gold"></i> Sign Up
      </a>`;
    return;
  }

  const user = store.user;
  const adminLinks = adminRoutes().filter((route) => guard(route).allowed);

  area.innerHTML = `
    <div class="relative">
      <button data-account-toggle aria-haspopup="true" aria-expanded="false"
              class="flex items-center gap-2 bg-blue-900/60 hover:bg-blue-800 px-2.5 py-0.5 rounded border border-blue-700/50 transition">
        <span class="w-5 h-5 rounded-full bg-brand-gold text-brand-darkBlue text-[9px] font-black flex items-center justify-center">${escapeHTML(initials(user.fullName))}</span>
        <span class="max-w-[10rem] truncate">${escapeHTML(user.firstName)}</span>
        <i class="fa-solid fa-chevron-down text-[8px] text-brand-gold"></i>
      </button>

      <div data-account-menu hidden
           class="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-60 bg-white text-slate-700 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
        <div class="px-4 py-2 border-b border-slate-100">
          <p class="font-bold text-slate-900 truncate">${escapeHTML(user.fullName)}</p>
          <p class="text-[11px] text-slate-500 truncate">${escapeHTML(user.email)}</p>
          <p class="mt-1 inline-block bg-blue-50 text-brand-blue font-bold px-2 py-0.5 rounded">
            ${escapeHTML(user.isSuperAdmin ? 'Super Admin' : user.role?.name || 'No role')}
          </p>
        </div>

        ${
          adminLinks.length
            ? `<div class="py-1 border-b border-slate-100">
                 ${adminLinks
                   .map(
                     (route) => `<a href="#${escapeHTML(route.path)}" class="block px-4 py-1.5 hover:bg-slate-50 transition">
                       <i class="fa-solid ${escapeHTML(route.admin.icon)} w-4 text-brand-gold"></i> ${escapeHTML(route.admin.label)}</a>`,
                   )
                   .join('')}
               </div>`
            : ''
        }

        <a href="#/profile" class="block px-4 py-2 hover:bg-slate-50 transition"><i class="fa-solid fa-user w-4 text-slate-400"></i> My Profile</a>
        <button data-logout class="w-full text-left rtl:text-right px-4 py-2 hover:bg-rose-50 text-rose-600 font-semibold transition">
          <i class="fa-solid fa-right-from-bracket w-4"></i> Sign Out
        </button>
      </div>
    </div>`;

  const toggle = area.querySelector('[data-account-toggle]');
  const menu = area.querySelector('[data-account-menu]');

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { menu.hidden = true; }));
  menu.querySelector('[data-logout]').addEventListener('click', () => logout());
  document.addEventListener('click', () => { menu.hidden = true; });
}

export async function logout() {
  const confirmed = await confirmDialog({
    title: 'Sign out?',
    message: 'You will need to sign in again to access your account.',
    confirmLabel: 'Sign Out',
    variant: 'primary',
    icon: 'fa-right-from-bracket',
  });
  if (!confirmed) return;

  await authService.logout();
  notify.success('You have been signed out.');
  navigate('/home');
}

export function toggleMobileMenu() {
  const menu = $('#mobile-menu');
  const icon = $('#mobile-menu-icon');
  if (!menu) return;
  const opening = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  if (icon) icon.className = opening ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
}

export function closeMobileMenu() {
  const menu = $('#mobile-menu');
  const icon = $('#mobile-menu-icon');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    if (icon) icon.className = 'fa-solid fa-bars';
  }
}

/** Highlights the active language button in the top bar. */
function renderLanguageSwitcher() {
  const active = 'hover:text-brand-gold transition flex items-center gap-1.5 text-brand-gold font-semibold focus-ring rounded px-1';
  const inactive = 'hover:text-brand-gold transition flex items-center gap-1.5 opacity-80 hover:opacity-100 focus-ring rounded px-1';
  const arabic = $('#lang-ar-btn');
  const english = $('#lang-en-btn');
  if (arabic) arabic.className = store.language === 'ar' ? active : inactive;
  if (english) english.className = store.language === 'en' ? active : inactive;
}

/** Wires the chrome and keeps it in sync with the session, route and language. */
export function initLayout() {
  const rerender = () => {
    renderNavigation();
    renderAccountArea();
    renderLanguageSwitcher();
    applyPermissions(document);
  };

  rerender();
  store.subscribe(rerender);
  onAfterNavigate(() => { rerender(); closeMobileMenu(); });
  window.addEventListener('fg:language-changed', rerender);

  // Legacy inline handlers in the original markup keep working.
  window.toggleMobileMenu = toggleMobileMenu;
  window.switchLanguage = setLanguage;
}

export default { initLayout, renderNavigation, renderAccountArea, toggleMobileMenu, closeMobileMenu, logout };
