# Future Gate National Schools — Frontend

Plain **HTML + CSS + JavaScript**. No framework, no bundler, no build step —
native ES modules served over HTTP.

Bilingual (English / Arabic RTL) public website, LMS lessons platform, online
admissions, and an administration panel gated by the backend's
roles-and-permissions system.

> **Backend repository:** [akg418/future_gate_edu_backend](https://github.com/akg418/future_gate_edu_backend)
> This frontend needs the API running; see *Quick start*.

---

## Quick start

This is a static site, but it must be served over **HTTP** — ES modules and the
HTML partial loader do not work from `file://`.

**Option A — the API serves it (recommended).** Check both repositories out side
by side; the backend serves this folder on the same origin, so the httpOnly
refresh cookie works with no CORS configuration:

```
project-root/
├── backend/     ← https://github.com/akg418/future_gate_edu_backend
└── frontend/    ← this repository
```

```bash
cd backend && npm install && npm run seed && npm start
# open http://localhost:5000
```

**Option B — serve it separately.**

```bash
npx serve -l 5500          # in this repository
```

Then add `http://localhost:5500` to `CORS_ORIGINS` in the backend's `.env`, and
tell this frontend where the API lives by adding **one** of these to
`index.html`, before `js/app.js`:

```html
<meta name="fg-api-base" content="http://localhost:5000/api/v1">
<!-- or -->
<script>window.__FG_API_BASE__ = 'http://localhost:5000/api/v1';</script>
```

Without an override the API base is simply the origin the page was served from,
which is what Option A relies on.

### Default Super Admin

| Email | Password |
| --- | --- |
| `superadmin@futuregate.edu` | `SuperAdmin@2026` |

---

## Folder structure

```
.
├── index.html              Application shell (slots + router outlet only)
├── assets/
│   ├── css/
│   │   ├── main.css            Original design styles, migrated verbatim
│   │   ├── components.css      Toasts, modals, tables, permission gating
│   │   └── tailwind.config.js  Brand palette, fonts, shadows
│   └── img/                    Logo and photography
├── pages/                  HTML partials, fetched and cached on demand
│   ├── partials/           topbar · header · footer · widgets · modals
│   ├── public/             home, about, programs, lessons, admissions, events,
│   │                       news, gallery, teachers, calendar, contact,
│   │                       login, signup, profile
│   └── admin/              dashboard, messages, applications, users, roles,
│                           lessons, content, media, settings, audit
└── js/
    ├── app.js              Entry point — boots the shell and starts the router
    ├── core/
    │   ├── config.js           API base, storage keys, defaults
    │   ├── http.js             Fetch client: auth header, token refresh, errors
    │   ├── store.js            Session state + publish/subscribe
    │   ├── router.js           Hash router with permission guards
    │   ├── routes.js           ★ THE ROUTE TABLE — one entry per page
    │   ├── permissions.js      can() / canAny() / applyPermissions()
    │   ├── i18n.js             EN/AR engine, RTL switching
    │   ├── templates.js        Partial loader + cache
    │   └── dom.js              $, escapeHTML, debounce, formatting helpers
    ├── i18n/                   en.js · ar.js (99 keys each)
    ├── services/               One API client per resource
    ├── components/             layout, dataTable, modal, toast, chat,
    │                           globalSearch, lightbox
    └── pages/                  One controller per page (lazy-loaded by route)
```

---

## How a page renders

```
hash change
   └─ router.js
        ├─ findRoute(path)
        ├─ guard(route)                 auth / permission check
        ├─ previous controller.unmount()
        ├─ loadTemplate(route.template) fetch + cache the HTML partial
        ├─ import(route.controller)     lazy, so a route only costs what it uses
        ├─ translate(outlet)            apply the active language
        ├─ applyPermissions(outlet)     hide what the user cannot use
        └─ controller.mount(outlet)     fetch data from the API and render
```

A page controller is a small module:

```js
export default {
  async mount(root, { route, query, navigate }) { /* fetch + render + bind */ },
  unmount() { /* clear timers and listeners */ },
};
```

---

## Adding a page

1. Create the partial — `pages/public/library.html`.
2. Create the controller — `js/pages/library.page.js`.
3. Add one entry to `js/core/routes.js`:

```js
{
  path: '/library',
  template: 'public/library.html',
  controller: () => import('../pages/library.page.js'),
  title: 'Library',
  permission: 'pages.library.view',   // omit for a public page
  nav: { label: 'Library', i18n: 'navLibrary', order: 12 },
}
```

Navigation, guards, lazy loading and the admin sidebar all follow from that
entry — nothing else needs editing.

---

## Permission attributes

The frontend mirrors the backend's rules so users aren't shown controls they
cannot use. **This is a usability layer, never a security one** — every hidden
action is independently rejected by the API.

```html
<button data-permission="users.delete">Delete</button>
<div    data-permission-any="news.create,events.create">…</div>
<a      data-auth="guest">Sign in</a>
<a      data-auth="user">My profile</a>
<span   data-super-admin>Super Admin only</span>
```

Call `applyPermissions(root)` after any render that injects new markup. In code,
use `can('users.delete')` / `canAny(...)`.

---

## Bilingual content

Translation is attribute-driven, so partials stay declarative:

```html
<h2 data-i18n="whyTitle">Why Choose Future Gate National Schools?</h2>
<input data-i18n-placeholder="searchLessons" />
```

Keys live in `js/i18n/en.js` and `js/i18n/ar.js`. Switching language flips
`<html dir>` and re-translates the page.

**Brand rule:** "Future Gate National Schools" is never translated. In Arabic it
stays in Latin script inside `dir="ltr" unicode-bidi: isolate`.

**CMS precedence:** elements whose text comes from the CMS are marked
`data-cms-managed` by `applyCmsText()`, and the translator skips them — live
content edits always win over the static dictionary.

---

## Reusable components

| Component | Use |
| --- | --- |
| `createDataTable({...})` | Admin tables: search, filters, server-side pagination, row actions |
| `openModal({...})` | Promise-based dialog; resolves with the result or `null` |
| `confirmDialog({...})` | Styled replacement for `window.confirm` |
| `notify.success/error/warning/info` | Toasts; `notify.fromError(err)` renders API validation errors |
| `openLightbox(src, title)` | Full-screen image viewer |
| `createListPage({...})` | Factory for "fetch a collection, render cards" pages |

---

## Notes

- **Serve over HTTP.** ES modules and `fetch()` of partials do not work from
  `file://`. The backend serves this folder by default.
- **API base** defaults to the page's own origin. Override it with a
  `<meta name="fg-api-base">` tag or `window.__FG_API_BASE__` when the frontend
  is served separately from the API. There is deliberately no port guessing —
  a heuristic silently targets the wrong server as soon as the API port changes.
- **XSS** all interpolated API values pass through `escapeHTML()`.
- **Token refresh** is automatic and de-duplicated: parallel 401s share one
  refresh, then the original requests replay.
- **Legacy handlers** — the original inline `onclick="showView('x')"` attributes
  still work; `js/app.js` maps them onto the router.

---

## Brand rules

- Official name: **Future Gate National Schools** — **never translated**. In
  Arabic mode it stays in Latin script inside `dir="ltr" unicode-bidi: isolate`.
- Palette: Primary `#0E3A75`, Deep Navy `#09254D`, Gold `#E5A823`, Light `#F8FAFC`.
- Typography: `Playfair Display` / `Cormorant Garamond` for display, `Inter` and
  `Cairo` for body.
- Layout container: `max-w-[1440px] mx-auto px-4 sm:px-8`.
