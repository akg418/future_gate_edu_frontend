import { createListPage } from './listPage.js';
import { teacherService } from '../services/index.js';
import { escapeHTML } from '../core/dom.js';

/** Faculty directory. */
export default createListPage({
  containerId: 'teachers-full-container',
  service: teacherService,
  query: { limit: 100, sort: 'order name' },
  emptyMessage: 'Faculty profiles are coming soon.',
  emptyIcon: 'fa-chalkboard-user',
  skeletonCount: 8,
  skeletonHeight: 'h-56',
  card: (teacher) => `
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-card text-center space-y-3">
      <img src="${escapeHTML(teacher.image || 'assets/img/logo.png')}" alt="${escapeHTML(teacher.name)}"
           class="w-24 h-24 rounded-full mx-auto object-cover border-4 border-brand-gold/30"
           onerror="this.src='assets/img/logo.png'" />
      <div>
        <h3 class="font-bold text-slate-900 text-base">${escapeHTML(teacher.name)}</h3>
        <p class="text-xs text-brand-blue font-semibold mt-0.5">${escapeHTML(teacher.title)}</p>
        <p class="text-[11px] text-slate-500">${escapeHTML(teacher.subject)}${teacher.experience ? ` &bull; ${escapeHTML(teacher.experience)} Experience` : ''}</p>
      </div>
    </div>`,
});
