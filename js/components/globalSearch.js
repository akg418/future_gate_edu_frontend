import { $, escapeHTML, debounce } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { searchService } from '../services/index.js';
import CONFIG from '../core/config.js';

/**
 * ⌘K / Ctrl+K global search.
 *
 * Results come from the backend's `/search` endpoint — which only ever returns
 * published content — rather than from in-memory arrays as the original did.
 */

let results = [];

function render(html) {
  const container = $('#global-search-results');
  if (container) container.innerHTML = html;
}

const runSearch = debounce(async (term) => {
  if (!term || term.trim().length < 2) {
    render('<div class="text-center py-8 text-slate-400">Type at least two characters to search across the Future Gate platform…</div>');
    return;
  }

  render('<div class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner animate-spin"></i> Searching…</div>');

  try {
    const response = await searchService.global(term);
    results = response.results;

    if (!results.length) {
      render(`<div class="text-center py-8 text-rose-500 font-medium">No results found for "${escapeHTML(term)}". Try another search term.</div>`);
      return;
    }

    render(
      results
        .map(
          (result, index) => `
        <button data-result-index="${index}" class="w-full text-left rtl:text-right p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 cursor-pointer flex items-center justify-between transition">
          <div>
            <span class="text-[9px] font-bold uppercase bg-blue-100 text-brand-blue px-2 py-0.5 rounded-md">${escapeHTML(result.type)}</span>
            <h4 class="font-bold text-slate-800 text-xs mt-1">${escapeHTML(result.title)}</h4>
            <p class="text-[11px] text-slate-500">${escapeHTML(result.description)}</p>
          </div>
          <i class="fa-solid fa-chevron-right rtl:fa-chevron-left text-slate-400 text-xs shrink-0"></i>
        </button>`,
        )
        .join(''),
    );
  } catch {
    render('<div class="text-center py-8 text-rose-500 font-medium">Search is unavailable right now. Please try again.</div>');
  }
}, CONFIG.defaults.searchDebounceMs);

export function openGlobalSearch() {
  const modal = $('#modal-global-search');
  if (!modal) return;
  modal.classList.remove('hidden');
  const input = $('#global-search-input');
  input?.focus();
  input?.select();
}

export function closeGlobalSearch() {
  $('#modal-global-search')?.classList.add('hidden');
}

export function initGlobalSearch() {
  const input = $('#global-search-input');
  const container = $('#global-search-results');

  input?.addEventListener('input', (event) => runSearch(event.target.value));

  container?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-result-index]');
    if (!button) return;
    const result = results[Number(button.dataset.resultIndex)];
    if (!result) return;
    closeGlobalSearch();
    navigate(`/${result.route}`);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openGlobalSearch();
    }
    if (event.key === 'Escape') closeGlobalSearch();
  });

  // Legacy inline handlers from the original markup.
  window.openGlobalSearchModal = openGlobalSearch;
  window.closeGlobalSearchModal = closeGlobalSearch;
  window.performGlobalSearch = () => runSearch($('#global-search-input')?.value || '');
  window.debouncedGlobalSearch = window.performGlobalSearch;
}

export default { initGlobalSearch, openGlobalSearch, closeGlobalSearch };
