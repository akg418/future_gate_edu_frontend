import en from '../i18n/en.js';
import ar from '../i18n/ar.js';
import store from './store.js';
import { $$ } from './dom.js';

/**
 * Bilingual engine (English LTR / Arabic RTL).
 *
 * Translation is attribute-driven: any element carrying `data-i18n="key"` has
 * its text replaced on switch, so partials stay declarative and no controller
 * needs to know about language.
 */

const DICTIONARIES = { en, ar };

export const availableLanguages = Object.keys(DICTIONARIES);

export function t(key, fallback = '') {
  return DICTIONARIES[store.language]?.[key] ?? DICTIONARIES.en[key] ?? fallback ?? key;
}

/**
 * Applies the active language to every translatable node under `root`.
 *
 * Elements marked `data-cms-managed` are skipped: their text was supplied by
 * the CMS, which is authoritative over the static dictionary. Without this the
 * router's post-mount translate pass would overwrite live content edits.
 */
export function translate(root = document) {
  const dictionary = DICTIONARIES[store.language] || DICTIONARIES.en;

  for (const element of $$('[data-i18n]:not([data-cms-managed])', root)) {
    const value = dictionary[element.dataset.i18n];
    if (value !== undefined) element.textContent = value;
  }
  for (const element of $$('[data-i18n-placeholder]', root)) {
    const value = dictionary[element.dataset.i18nPlaceholder];
    if (value !== undefined) element.setAttribute('placeholder', value);
  }
  for (const element of $$('[data-i18n-title]', root)) {
    const value = dictionary[element.dataset.i18nTitle];
    if (value !== undefined) element.setAttribute('title', value);
  }
}

/** Switches language, flips document direction and re-translates the page. */
export function setLanguage(language) {
  if (!DICTIONARIES[language]) return;
  store.setLanguage(language);

  const root = document.documentElement;
  root.setAttribute('lang', language);
  root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');

  translate(document);
  window.dispatchEvent(new CustomEvent('fg:language-changed', { detail: { language } }));
}

/** Restores the saved language on boot. */
export function initLanguage() {
  setLanguage(store.language);
}

/** Locale tag for `toLocaleDateString`, following the active language. */
export const locale = () => (store.language === 'ar' ? 'ar-EG' : 'en-GB');

export default { t, translate, setLanguage, initLanguage, availableLanguages, locale };
