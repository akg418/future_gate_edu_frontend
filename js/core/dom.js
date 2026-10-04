/**
 * Small DOM and formatting helpers shared by every page controller.
 *
 * `escapeHTML` is the important one: all list rendering builds HTML strings, so
 * every interpolated value from the API must pass through it.
 */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/** Escapes the five characters that can break out of HTML text or an attribute. */
export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char),
  );
}

export function debounce(fn, wait = 250) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Reads a form into a plain object, trimming string values. */
export function formData(form) {
  const values = {};
  for (const [key, value] of new FormData(form).entries()) {
    values[key] = typeof value === 'string' ? value.trim() : value;
  }
  return values;
}

/** Puts a form's submit button into a spinner state and returns a restore function. */
export function withButtonLoading(button, loadingLabel = 'Please wait…') {
  if (!button) return () => {};
  const original = button.innerHTML;
  const wasDisabled = button.disabled;
  button.disabled = true;
  button.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> ${escapeHTML(loadingLabel)}`;
  return () => {
    button.disabled = wasDisabled;
    button.innerHTML = original;
  };
}

export function formatDate(value, locale = 'en-GB') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value, locale = 'en-GB') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** `2026-05-20` — the shape an `<input type="date">` expects. */
export function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

/** Renders a centred empty/error state inside a container. */
export function emptyState(message, icon = 'fa-inbox') {
  return `
    <div class="col-span-full text-center py-12 text-slate-400">
      <i class="fa-solid ${escapeHTML(icon)} text-3xl mb-3 block"></i>
      <p class="text-sm">${escapeHTML(message)}</p>
    </div>`;
}

export function skeletonCards(count = 3, height = 'h-48') {
  return Array.from({ length: count })
    .map(() => `<div class="bg-slate-100 animate-pulse rounded-3xl ${height}"></div>`)
    .join('');
}

/**
 * Writes CMS-supplied text into an element and marks it so the i18n pass leaves
 * it alone. CMS content is authoritative over the static dictionary.
 */
export function applyCmsText(element, value) {
  if (!element || value === undefined || value === null || value === '') return;
  element.textContent = value;
  element.setAttribute('data-cms-managed', '');
}

/** Delegated event binding that survives re-rendered innerHTML. */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}
