import { escapeHTML } from '../core/dom.js';

/**
 * Promise-based dialogs, replacing the original `prompt()` / `confirm()` flows
 * with accessible, styled modals that match the site design.
 */

let openCount = 0;

function buildShell({ title, icon, body, footer, size = 'max-w-lg' }) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 fg-modal-enter';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="bg-white rounded-3xl ${size} w-full shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
      <div class="flex items-start justify-between gap-4 p-6 pb-4 border-b border-slate-100">
        <div class="flex items-center gap-3">
          ${icon ? `<div class="w-10 h-10 rounded-2xl bg-brand-darkBlue text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid ${escapeHTML(icon)}"></i></div>` : ''}
          <h3 class="text-lg font-bold text-brand-darkBlue font-display leading-tight">${escapeHTML(title)}</h3>
        </div>
        <button data-modal-close aria-label="Close dialog" class="text-slate-400 hover:text-slate-700 text-lg shrink-0"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div data-modal-body class="p-6 overflow-y-auto text-sm text-slate-700">${body}</div>
      <div data-modal-footer class="p-6 pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">${footer}</div>
    </div>`;
  return overlay;
}

/** Opens a modal and resolves with whatever `onSubmit` returns, or `null` if dismissed. */
export function openModal({ title, icon, body = '', footer = '', size, onMount, onSubmit }) {
  return new Promise((resolve) => {
    const overlay = buildShell({ title, icon, body, footer, size });
    document.body.appendChild(overlay);
    openCount += 1;
    document.body.style.overflow = 'hidden';

    const close = (result = null) => {
      overlay.remove();
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    };

    function onKeydown(event) {
      if (event.key === 'Escape') close(null);
    }

    overlay.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', () => close(null)));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });
    document.addEventListener('keydown', onKeydown);

    const form = overlay.querySelector('form');
    if (form && onSubmit) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = await onSubmit(form, close);
        if (result !== undefined) close(result);
      });
    }

    if (onMount) onMount(overlay, close);
    // Focus the first field so keyboard users can start typing straight away.
    overlay.querySelector('input, select, textarea, button:not([data-modal-close])')?.focus();
  });
}

/** Styled replacement for `window.confirm`, resolving to `true`/`false`. */
export function confirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon = 'fa-triangle-exclamation',
} = {}) {
  const confirmClasses =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-brand-blue hover:bg-brand-darkBlue text-white';

  return openModal({
    title,
    icon,
    size: 'max-w-md',
    body: `<p class="leading-relaxed">${escapeHTML(message)}</p>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">${escapeHTML(cancelLabel)}</button>
      <button data-confirm class="px-5 py-2.5 rounded-xl text-xs font-bold ${confirmClasses}">${escapeHTML(confirmLabel)}</button>`,
    onMount(overlay, close) {
      overlay.querySelector('[data-confirm]').addEventListener('click', () => close(true));
    },
  }).then((result) => result === true);
}

export default { openModal, confirmDialog };
