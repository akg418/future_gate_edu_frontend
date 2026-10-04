import { routes, findRoute } from './routes.js';
import { loadTemplate } from './templates.js';
import { can, applyPermissions } from './permissions.js';
import { translate } from './i18n.js';
import store from './store.js';
import CONFIG from './config.js';

/**
 * Hash-based SPA router with permission guards.
 *
 * Hash routing keeps deep links working on any static host with no server
 * rewrite rules, which matters because this frontend is plain HTML/CSS/JS.
 *
 * Navigating a route:
 *   1. resolve the route and run its guard (auth / permission);
 *   2. tear down the previous page controller;
 *   3. fetch + inject the HTML partial;
 *   4. translate it, apply permission attributes, then mount the controller.
 *
 * The permission guard here is a usability layer. The API independently
 * rejects any request the user is not entitled to make.
 */

let outlet = null;
let currentController = null;
let currentRoute = null;
const afterNavigateHooks = new Set();

/** Reads the hash into `{ path, query }` — `#/lessons?grade=Primary`. */
function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryString] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));
  return { path: path === '' ? '/' : path, query };
}

export function navigate(path, { replace = false } = {}) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}

export const currentPath = () => parseHash().path;

export function onAfterNavigate(hook) {
  afterNavigateHooks.add(hook);
  return () => afterNavigateHooks.delete(hook);
}

/** Decides whether the current user may open a route. */
export function guard(route) {
  if (!route) return { allowed: false, reason: 'not-found' };
  if (route.guestOnly && store.isAuthenticated) return { allowed: false, reason: 'guest-only' };
  if (route.requiresAuth && !store.isAuthenticated) return { allowed: false, reason: 'auth-required' };
  if (route.permission) {
    if (!store.isAuthenticated) return { allowed: false, reason: 'auth-required' };
    if (!can(route.permission)) return { allowed: false, reason: 'forbidden' };
  }
  return { allowed: true };
}

function renderMessage({ icon, title, message, actionLabel, actionHref }) {
  outlet.innerHTML = `
    <section class="page-view py-20 bg-slate-50">
      <div class="max-w-xl mx-auto px-4 text-center space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-brand-darkBlue text-brand-gold flex items-center justify-center text-2xl mx-auto shadow-md">
          <i class="fa-solid ${icon}"></i>
        </div>
        <h1 class="text-2xl font-black text-brand-darkBlue font-display">${title}</h1>
        <p class="text-sm text-slate-600 leading-relaxed">${message}</p>
        ${actionLabel ? `<a href="${actionHref}" class="inline-block gold-button text-brand-darkBlue font-extrabold px-6 py-2.5 rounded-full text-sm shadow-md">${actionLabel}</a>` : ''}
      </div>
    </section>`;
}

async function renderRoute() {
  const { path, query } = parseHash();
  const route = findRoute(path);

  if (route?.redirect) return navigate(route.redirect, { replace: true });

  // Tear down the previous page so its listeners and timers do not leak.
  if (currentController?.unmount) {
    try { currentController.unmount(); } catch (error) { console.error('unmount failed', error); }
  }
  currentController = null;

  if (!route) {
    renderMessage({
      icon: 'fa-compass', title: 'Page Not Found',
      message: 'The page you are looking for does not exist or may have been moved.',
      actionLabel: 'Back to Home', actionHref: '#/home',
    });
    return finish(null);
  }

  const verdict = guard(route);
  if (!verdict.allowed) {
    if (verdict.reason === 'guest-only') return navigate('/home', { replace: true });
    if (verdict.reason === 'auth-required') {
      sessionStorage.setItem('fg_redirect_after_login', path);
      return navigate('/login', { replace: true });
    }
    renderMessage({
      icon: 'fa-lock', title: 'Access Restricted',
      message: 'You do not have permission to view this page. If you believe this is a mistake, please contact your administrator.',
      actionLabel: 'Back to Home', actionHref: '#/home',
    });
    return finish(route);
  }

  outlet.innerHTML = `
    <div class="max-w-[1440px] mx-auto px-4 sm:px-8 py-16 space-y-4">
      <div class="h-8 w-56 bg-slate-100 animate-pulse rounded-xl"></div>
      <div class="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
    </div>`;

  try {
    const [html, module] = await Promise.all([
      loadTemplate(route.template),
      route.controller ? route.controller() : Promise.resolve(null),
    ]);

    outlet.innerHTML = html;
    document.title = `${route.title} | ${CONFIG.school.name}`;

    translate(outlet);
    applyPermissions(outlet);

    const controller = module?.default || module;
    if (controller?.mount) {
      currentController = controller;
      await controller.mount(outlet, { route, query, navigate });
      // Content rendered by the controller needs gating and translation too.
      translate(outlet);
      applyPermissions(outlet);
    }
  } catch (error) {
    console.error(`Failed to render route ${path}`, error);
    renderMessage({
      icon: 'fa-triangle-exclamation', title: 'Something Went Wrong',
      message: 'This page could not be loaded. Please refresh and try again.',
      actionLabel: 'Back to Home', actionHref: '#/home',
    });
  }

  return finish(route);
}

function finish(route) {
  currentRoute = route;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  for (const hook of afterNavigateHooks) {
    try { hook(route); } catch (error) { console.error('after-navigate hook failed', error); }
  }
}

export function startRouter(outletElement) {
  outlet = outletElement;
  window.addEventListener('hashchange', renderRoute);
  // Re-evaluate the current route when the session changes, so a logout on a
  // protected page bounces the user out immediately.
  store.subscribe(() => {
    if (currentRoute && !guard(currentRoute).allowed) renderRoute();
  });
  if (!window.location.hash) navigate('/home', { replace: true });
  else renderRoute();
}

export const router = { navigate, startRouter, currentPath, guard, onAfterNavigate, routes };
export default router;
