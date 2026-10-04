import { escapeHTML } from '../core/dom.js';
import CONFIG from '../core/config.js';

/**
 * Non-blocking notifications, replacing the `alert()` calls the original page
 * used for every success and error.
 */

let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.id = 'fg-toast-container';
  container.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,26rem)]';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

const VARIANTS = {
  success: { icon: 'fa-circle-check', classes: 'bg-emerald-600 text-white' },
  error: { icon: 'fa-circle-exclamation', classes: 'bg-rose-600 text-white' },
  warning: { icon: 'fa-triangle-exclamation', classes: 'bg-amber-500 text-brand-darkBlue' },
  info: { icon: 'fa-circle-info', classes: 'bg-brand-blue text-white' },
};

export function toast(message, variant = 'info', duration = CONFIG.defaults.toastDuration) {
  const { icon, classes } = VARIANTS[variant] || VARIANTS.info;
  const element = document.createElement('div');
  element.className = `${classes} px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-start gap-3 fg-toast-enter`;
  element.innerHTML = `
    <i class="fa-solid ${icon} mt-0.5 shrink-0"></i>
    <span class="flex-1 leading-relaxed">${escapeHTML(message)}</span>
    <button class="opacity-70 hover:opacity-100 shrink-0" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;

  const dismiss = () => {
    element.classList.add('fg-toast-leave');
    setTimeout(() => element.remove(), 200);
  };
  element.querySelector('button').addEventListener('click', dismiss);

  ensureContainer().appendChild(element);
  if (duration > 0) setTimeout(dismiss, duration);
  return dismiss;
}

export const notify = {
  success: (message, duration) => toast(message, 'success', duration),
  error: (message, duration) => toast(message, 'error', duration),
  warning: (message, duration) => toast(message, 'warning', duration),
  info: (message, duration) => toast(message, 'info', duration),

  /**
   * Renders an ApiClientError sensibly: validation errors list the offending
   * fields, everything else shows the server's message.
   */
  fromError(error, fallback = 'Something went wrong. Please try again.') {
    const fields = error?.fieldErrors || [];
    if (fields.length) {
      return toast(`${error.message} — ${fields.map((f) => f.message).join('; ')}`, 'error', 7000);
    }
    return toast(error?.message || fallback, 'error');
  },
};

export default notify;
