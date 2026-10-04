/**
 * Application-wide configuration.
 *
 * The API base defaults to the origin this page was served from, because the
 * backend serves this frontend in the normal setup — that keeps everything
 * same-origin, so the httpOnly refresh cookie works with no CORS configuration
 * and the API port can change freely.
 *
 * When the frontend is served separately (a static dev server, a CDN), point it
 * at the API explicitly, in either of two ways:
 *
 *   <meta name="fg-api-base" content="http://localhost:5000/api/v1">
 *   <script>window.__FG_API_BASE__ = 'http://localhost:5000/api/v1';</script>
 *
 * Both must appear before js/app.js loads. Deliberately no port guessing: a
 * heuristic silently points at the wrong server the moment PORT changes.
 */
const inferApiBase = () => {
  if (typeof window !== 'undefined' && window.__FG_API_BASE__) return window.__FG_API_BASE__;

  const meta = document.querySelector('meta[name="fg-api-base"]')?.content?.trim();
  if (meta) return meta.replace(/\/$/, '');

  return `${window.location.origin}/api/v1`;
};

export const CONFIG = Object.freeze({
  apiBase: inferApiBase(),

  storageKeys: {
    accessToken: 'fg_access_token',
    refreshToken: 'fg_refresh_token',
    user: 'fg_user',
    language: 'fg_language',
  },

  defaults: {
    language: 'en',
    pageSize: 20,
    toastDuration: 4000,
    searchDebounceMs: 250,
  },

  school: {
    name: 'Future Gate National Schools',
    phone: '01206192111',
    whatsapp: '201206192111',
    email: 'info@futuregate.edu',
  },

  fallbackImage: 'assets/img/students-classroom.jpg',
});

export default CONFIG;
