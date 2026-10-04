import { createListPage } from './listPage.js';
import { calendarService } from '../services/index.js';
import { escapeHTML } from '../core/dom.js';
import { locale } from '../core/i18n.js';

/** Academic calendar listing. */
export default createListPage({
  containerId: 'calendar-items-list',
  service: calendarService,
  query: { limit: 100, sort: 'date' },
  emptyMessage: 'The academic calendar has not been published yet.',
  emptyIcon: 'fa-calendar',
  skeletonCount: 5,
  skeletonHeight: 'h-16',
  card: (entry) => `
    <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
          <i class="fa-solid fa-calendar"></i>
        </div>
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate">${escapeHTML(entry.title)}</h4>
          <p class="text-[11px] text-slate-500">${escapeHTML(new Date(entry.date).toLocaleDateString(locale(), { day: '2-digit', month: 'long', year: 'numeric' }))}</p>
        </div>
      </div>
      <span class="text-xs font-bold px-3 py-1 rounded-full shrink-0 ${escapeHTML(entry.color)}">${escapeHTML(entry.type)}</span>
    </div>`,
});
