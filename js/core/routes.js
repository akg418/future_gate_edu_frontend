/**
 * ============================================================================
 * ROUTE TABLE — the frontend's single source of truth for navigation.
 * ============================================================================
 *
 * Each route declares:
 *   path        hash path, e.g. `/admin/users`
 *   template    HTML partial under `pages/`
 *   controller  lazy `import()` of the page module (code-split by route)
 *   permission  permission key required to open the page (omit for public)
 *   requiresAuth  page needs a signed-in user but no specific permission
 *   nav         optional label + placement in the main navigation
 *
 * ADDING A PAGE: add one entry here, create the partial and the controller.
 * Nothing else in the router needs to change.
 */

export const routes = [
  /* ------------------------------ Public site ------------------------------ */
  { path: '/', redirect: '/home' },
  { path: '/home', template: 'public/home.html', controller: () => import('../pages/home.page.js'), title: 'Home', nav: { label: 'Home', i18n: null, order: 1 } },
  { path: '/about', template: 'public/about.html', controller: () => import('../pages/about.page.js'), title: 'About Us', nav: { label: 'About Us', i18n: 'navAbout', order: 2 } },
  { path: '/programs', template: 'public/programs.html', controller: () => import('../pages/programs.page.js'), title: 'Academic Programs', nav: { label: 'Academic Programs', i18n: 'navPrograms', order: 3 } },
  { path: '/lessons', template: 'public/lessons.html', controller: () => import('../pages/lessons.page.js'), title: 'Lessons Platform', nav: { label: 'Lessons', i18n: 'navLessons', order: 4, badge: 'LMS' } },
  { path: '/admissions', template: 'public/admissions.html', controller: () => import('../pages/admissions.page.js'), title: 'Admissions', nav: { label: 'Admissions', i18n: 'navAdmissions', order: 5 } },
  { path: '/events', template: 'public/events.html', controller: () => import('../pages/events.page.js'), title: 'Events', nav: { label: 'Events', i18n: 'navEvents', order: 6 } },
  { path: '/news', template: 'public/news.html', controller: () => import('../pages/news.page.js'), title: 'News', nav: { label: 'News', i18n: 'navNews', order: 7 } },
  { path: '/gallery', template: 'public/gallery.html', controller: () => import('../pages/gallery.page.js'), title: 'Gallery', nav: { label: 'Gallery', i18n: 'navGallery', order: 8 } },
  { path: '/teachers', template: 'public/teachers.html', controller: () => import('../pages/teachers.page.js'), title: 'Teachers', nav: { label: 'Teachers', i18n: 'navTeachers', order: 9 } },
  { path: '/calendar', template: 'public/calendar.html', controller: () => import('../pages/calendar.page.js'), title: 'Academic Calendar', nav: { label: 'Calendar', i18n: 'navCalendar', order: 10 } },
  { path: '/contact', template: 'public/contact.html', controller: () => import('../pages/contact.page.js'), title: 'Contact Us', nav: { label: 'Contact Us', i18n: 'navContact', order: 11 } },

  /* -------------------------------- Account -------------------------------- */
  { path: '/login', template: 'public/login.html', controller: () => import('../pages/login.page.js'), title: 'Sign In', guestOnly: true },
  { path: '/signup', template: 'public/signup.html', controller: () => import('../pages/signup.page.js'), title: 'Create Account', guestOnly: true },
  { path: '/profile', template: 'public/profile.html', controller: () => import('../pages/profile.page.js'), title: 'My Profile', requiresAuth: true },

  /* ------------------------------ Admin panel ------------------------------ */
  {
    path: '/admin', template: 'admin/dashboard.html', controller: () => import('../pages/admin/dashboard.page.js'),
    title: 'Admin Dashboard', permission: 'pages.admin-dashboard.view',
    admin: { label: 'Dashboard', icon: 'fa-gauge-high', order: 1 },
  },
  {
    path: '/admin/messages', template: 'admin/messages.html', controller: () => import('../pages/admin/messages.page.js'),
    title: 'Messages', permission: 'pages.admin-messages.view',
    admin: { label: 'Messages', icon: 'fa-envelope', order: 2 },
  },
  {
    path: '/admin/applications', template: 'admin/applications.html', controller: () => import('../pages/admin/applications.page.js'),
    title: 'Applications', permission: 'pages.admin-applications.view',
    admin: { label: 'Applications', icon: 'fa-file-signature', order: 3 },
  },
  {
    path: '/admin/users', template: 'admin/users.html', controller: () => import('../pages/admin/users.page.js'),
    title: 'User Management', permission: 'pages.admin-users.view',
    admin: { label: 'Users', icon: 'fa-users', order: 4 },
  },
  {
    path: '/admin/roles', template: 'admin/roles.html', controller: () => import('../pages/admin/roles.page.js'),
    title: 'Roles & Permissions', permission: 'pages.admin-roles.view',
    admin: { label: 'Roles & Permissions', icon: 'fa-user-shield', order: 5 },
  },
  {
    path: '/admin/lessons', template: 'admin/lessons.html', controller: () => import('../pages/admin/lessons.page.js'),
    title: 'Lessons CMS', permission: 'pages.admin-lessons.view',
    admin: { label: 'Lessons CMS', icon: 'fa-chalkboard-user', order: 6 },
  },
  {
    path: '/admin/content', template: 'admin/content.html', controller: () => import('../pages/admin/content.page.js'),
    title: 'Content Manager', permission: 'pages.admin-content.view',
    admin: { label: 'Content', icon: 'fa-newspaper', order: 7 },
  },
  {
    path: '/admin/media', template: 'admin/media.html', controller: () => import('../pages/admin/media.page.js'),
    title: 'Media Library', permission: 'pages.admin-media.view',
    admin: { label: 'Media Library', icon: 'fa-images', order: 8 },
  },
  {
    path: '/admin/settings', template: 'admin/settings.html', controller: () => import('../pages/admin/settings.page.js'),
    title: 'Site Settings', permission: 'pages.admin-settings.view',
    admin: { label: 'Site Settings', icon: 'fa-sliders', order: 9 },
  },
  {
    path: '/admin/audit', template: 'admin/audit.html', controller: () => import('../pages/admin/audit.page.js'),
    title: 'Audit Trail', permission: 'pages.admin-audit.view',
    admin: { label: 'Audit Trail', icon: 'fa-clock-rotate-left', order: 10 },
  },
];

/** Routes that appear in the public main navigation, in display order. */
export const navRoutes = () => routes.filter((route) => route.nav).sort((a, b) => a.nav.order - b.nav.order);

/** Routes that appear in the admin sidebar, in display order. */
export const adminRoutes = () => routes.filter((route) => route.admin).sort((a, b) => a.admin.order - b.admin.order);

export function findRoute(path) {
  return routes.find((route) => route.path === path) || null;
}

export default routes;
