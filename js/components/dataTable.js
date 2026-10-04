import { escapeHTML, debounce, delegate } from '../core/dom.js';
import CONFIG from '../core/config.js';
import notify from './toast.js';

/**
 * Reusable admin table: search, filters, server-side pagination and row actions.
 *
 * Every admin management screen (messages, users, applications, lessons, media,
 * audit) renders through this one component, so they share behaviour and any
 * improvement lands everywhere at once.
 *
 * @param {object}   options
 * @param {HTMLElement} options.mount        Container element.
 * @param {Array}    options.columns         `{ key, header, render?, className?, headerClassName? }`
 * @param {Function} options.fetcher         `(query) => ({ items, pagination })`
 * @param {Array}    options.filters         `{ key, label, options: [{value,label}] }`
 * @param {string}   options.searchPlaceholder
 * @param {string}   options.emptyMessage
 * @param {Function} options.rowId           Row → unique id (default `_id`).
 * @param {object}   options.actions         `{ [actionName]: (row, api) => void }` for `data-action` buttons.
 */
export function createDataTable({
  mount,
  columns,
  fetcher,
  filters = [],
  searchPlaceholder = 'Search…',
  emptyMessage = 'No records found.',
  emptyIcon = 'fa-inbox',
  rowId = (row) => row._id,
  actions = {},
  pageSize = CONFIG.defaults.pageSize,
  toolbarExtra = '',
}) {
  const state = {
    page: 1,
    limit: pageSize,
    search: '',
    filters: {},
    items: [],
    pagination: null,
    loading: false,
  };

  mount.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <i class="fa-solid fa-magnifying-glass absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input data-table-search type="search" placeholder="${escapeHTML(searchPlaceholder)}"
                 class="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-brand-blue" />
        </div>
        ${filters
          .map(
            (filter) => `
          <select data-table-filter="${escapeHTML(filter.key)}"
                  class="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-brand-blue">
            ${filter.options.map((option) => `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join('')}
          </select>`,
          )
          .join('')}
        <div class="flex items-center gap-2">${toolbarExtra}</div>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-slate-200">
        <table class="w-full text-left rtl:text-right text-xs">
          <thead class="bg-slate-50 text-slate-700 uppercase">
            <tr>${columns.map((column) => `<th class="p-3 font-bold ${column.headerClassName || ''}">${escapeHTML(column.header)}</th>`).join('')}</tr>
          </thead>
          <tbody data-table-body class="divide-y divide-slate-100 bg-white"></tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span data-table-summary></span>
        <div class="flex items-center gap-2">
          <button data-table-prev class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="fa-solid fa-chevron-left rtl:hidden"></i><i class="fa-solid fa-chevron-right hidden rtl:inline"></i> Prev
          </button>
          <span data-table-pages class="font-semibold"></span>
          <button data-table-next class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            Next <i class="fa-solid fa-chevron-right rtl:hidden"></i><i class="fa-solid fa-chevron-left hidden rtl:inline"></i>
          </button>
        </div>
      </div>
    </div>`;

  const body = mount.querySelector('[data-table-body]');
  const summary = mount.querySelector('[data-table-summary]');
  const pages = mount.querySelector('[data-table-pages]');
  const prev = mount.querySelector('[data-table-prev]');
  const next = mount.querySelector('[data-table-next]');

  function renderRows() {
    if (state.loading) {
      body.innerHTML = Array.from({ length: 4 })
        .map(
          () =>
            `<tr>${columns.map(() => '<td class="p-3"><div class="h-4 bg-slate-100 animate-pulse rounded"></div></td>').join('')}</tr>`,
        )
        .join('');
      return;
    }

    if (!state.items.length) {
      body.innerHTML = `
        <tr><td colspan="${columns.length}" class="p-12 text-center text-slate-400">
          <i class="fa-solid ${escapeHTML(emptyIcon)} text-3xl mb-3 block"></i>
          <span class="text-sm">${escapeHTML(emptyMessage)}</span>
        </td></tr>`;
      return;
    }

    body.innerHTML = state.items
      .map(
        (row) => `
        <tr data-row-id="${escapeHTML(rowId(row))}" class="hover:bg-slate-50 transition">
          ${columns.map((column) => `<td class="p-3 align-middle ${column.className || ''}">${column.render ? column.render(row) : escapeHTML(row[column.key] ?? '')}</td>`).join('')}
        </tr>`,
      )
      .join('');
  }

  function renderPagination() {
    const pagination = state.pagination;
    if (!pagination) {
      summary.textContent = '';
      pages.textContent = '';
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const to = Math.min(pagination.page * pagination.limit, pagination.total);
    summary.textContent = `Showing ${from}–${to} of ${pagination.total}`;
    pages.textContent = `Page ${pagination.page} of ${pagination.pages || 1}`;
    prev.disabled = !pagination.hasPrev;
    next.disabled = !pagination.hasNext;
  }

  async function reload() {
    state.loading = true;
    renderRows();
    try {
      const result = await fetcher({ page: state.page, limit: state.limit, search: state.search, ...state.filters });
      state.items = result.items || [];
      state.pagination = result.pagination;
    } catch (error) {
      state.items = [];
      state.pagination = null;
      notify.fromError(error, 'Could not load the records.');
    } finally {
      state.loading = false;
      renderRows();
      renderPagination();
    }
  }

  const api = {
    reload,
    get items() { return state.items; },
    findRow: (id) => state.items.find((row) => String(rowId(row)) === String(id)),
    goToPage(page) { state.page = page; return reload(); },
  };

  mount.querySelector('[data-table-search]').addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value.trim();
      state.page = 1;
      reload();
    }, CONFIG.defaults.searchDebounceMs),
  );

  for (const select of mount.querySelectorAll('[data-table-filter]')) {
    select.addEventListener('change', (event) => {
      state.filters[select.dataset.tableFilter] = event.target.value;
      state.page = 1;
      reload();
    });
  }

  prev.addEventListener('click', () => {
    if (state.page > 1) { state.page -= 1; reload(); }
  });
  next.addEventListener('click', () => {
    state.page += 1;
    reload();
  });

  // Row action buttons are delegated, so they survive every re-render.
  delegate(body, 'click', '[data-action]', (event, button) => {
    event.preventDefault();
    const handler = actions[button.dataset.action];
    if (!handler) return;
    const row = api.findRow(button.closest('[data-row-id]')?.dataset.rowId);
    if (row) handler(row, api, button);
  });

  reload();
  return api;
}

/** Small coloured status pill used across the admin tables. */
export function statusBadge(label, tone = 'slate') {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-800',
    rose: 'bg-rose-100 text-rose-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    slate: 'bg-slate-100 text-slate-700',
    purple: 'bg-purple-100 text-purple-800',
  };
  return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${tones[tone] || tones.slate}">${escapeHTML(label)}</span>`;
}

export default createDataTable;
