/**
 * ============================================================================
 * Future Gate National Schools — frontend entry point
 * ============================================================================
 *
 * Boot order matters:
 *   1. inject the static chrome (top bar, header, footer, widgets, modals);
 *   2. restore language and session, and download the permission catalogue;
 *   3. wire the layout, global search and AI assistant;
 *   4. start the router, which renders the first route.
 */

import { $, } from './core/dom.js';
import { loadTemplate, prefetchTemplates } from './core/templates.js';
import { initLanguage, translate, setLanguage } from './core/i18n.js';
import { applyPermissions } from './core/permissions.js';
import { startRouter, navigate } from './core/router.js';
import store from './core/store.js';
import { authService } from './services/index.js';
import { initLayout } from './components/layout.js';
import { initGlobalSearch, openGlobalSearch } from './components/globalSearch.js';
import { initChat } from './components/chat.js';
import openLightbox from './components/lightbox.js';
import notify from './components/toast.js';

/** Loads the persistent chrome partials into their mount points. */
async function injectChrome() {
  const slots = [
    ['#topbar-slot', 'partials/topbar.html'],
    ['#header-slot', 'partials/header.html'],
    ['#footer-slot', 'partials/footer.html'],
    ['#widgets-slot', 'partials/widgets.html'],
    ['#modals-slot', 'partials/modals.html'],
  ];

  await Promise.all(
    slots.map(async ([selector, path]) => {
      const mount = $(selector);
      if (!mount) return;
      try {
        mount.innerHTML = await loadTemplate(path);
      } catch (error) {
        console.error(`Could not load ${path}`, error);
      }
    }),
  );
}

/**
 * Re-reads the signed-in identity on boot. A stale cached user (deactivated,
 * role changed, permissions revoked) is corrected here before anything renders.
 */
async function restoreSession() {
  if (!store.accessToken) return;
  try {
    await authService.me();
  } catch {
    store.clearSession();
  }
}

/** Legacy inline handlers from the original markup, mapped to the new modules. */
function exposeLegacyGlobals() {
  window.showView = (view) => navigate(`/${view === 'admin' ? 'admin' : view}`);
  window.openLightbox = openLightbox;
  window.switchLanguage = setLanguage;
  window.openGlobalSearchModal = openGlobalSearch;

  window.openVirtualTourModal = () => $('#modal-virtual-tour')?.classList.remove('hidden');
  window.closeVirtualTourModal = () => {
    const modal = $('#modal-virtual-tour');
    modal?.querySelector('video')?.pause();
    modal?.classList.add('hidden');
  };

  // The old role-picker modal is gone; send anyone who reaches it to real auth.
  window.openAdminModal = () => navigate('/login');
  window.closeAdminModal = () => {};
}

async function boot() {
  await injectChrome();

  initLanguage();
  await restoreSession();

  // The catalogue only labels permissions in the UI; it grants nothing.
  authService.permissionCatalogue().catch(() => {});

  exposeLegacyGlobals();
  initLayout();
  initGlobalSearch();
  initChat();

  translate(document);
  applyPermissions(document);

  startRouter($('#app-view'));

  // Warm the templates most visitors open next.
  prefetchTemplates(['public/about.html', 'public/programs.html', 'public/contact.html']);

  // A refresh failure anywhere in the app lands here.
  window.addEventListener('fg:session-expired', () => {
    notify.warning('Your session has expired. Please sign in again.', 6000);
    navigate('/login');
  });

  document.body.classList.remove('fg-booting');
}

boot().catch((error) => {
  console.error('Application failed to start', error);
  const outlet = $('#app-view');
  if (outlet) {
    outlet.innerHTML = `
      <section class="py-24 text-center px-4">
        <h1 class="text-2xl font-black text-brand-darkBlue font-display">The application could not start</h1>
        <p class="text-sm text-slate-600 mt-2">Please refresh the page. If the problem persists, contact the school IT administrator.</p>
      </section>`;
  }
});
