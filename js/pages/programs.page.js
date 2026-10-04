import { createListPage } from './listPage.js';
import { programService } from '../services/index.js';
import { escapeHTML } from '../core/dom.js';

/** Academic programs, one card per educational stage. */
const STAGE_TONE = {
  Kindergarten: 'bg-amber-100 text-amber-700',
  Primary: 'bg-blue-100 text-blue-700',
  Preparatory: 'bg-emerald-100 text-emerald-700',
  Secondary: 'bg-purple-100 text-purple-700',
  Special: 'bg-slate-100 text-slate-700',
};

export default createListPage({
  containerId: 'programs-grid',
  service: programService,
  query: { limit: 50, sort: 'order' },
  emptyMessage: 'Academic programs are being prepared.',
  emptyIcon: 'fa-graduation-cap',
  skeletonCount: 4,
  skeletonHeight: 'h-64',
  card: (program) => `
    <div class="bg-white p-6 rounded-3xl shadow-card border border-slate-200 space-y-4 flex flex-col justify-between">
      <div>
        <div class="w-12 h-12 rounded-2xl ${STAGE_TONE[program.stage] || STAGE_TONE.Special} flex items-center justify-center text-2xl mb-4">
          <i class="${escapeHTML(program.icon || 'fa-solid fa-graduation-cap')}"></i>
        </div>
        <h3 class="text-xl font-extrabold text-brand-darkBlue">${escapeHTML(program.title)}</h3>
        <p class="text-xs text-slate-500 mt-1">
          ${escapeHTML(program.ageRange)}${program.ageRange && program.gradeRange ? ' &bull; ' : ''}${escapeHTML(program.gradeRange)}
        </p>
        <p class="text-slate-600 text-sm mt-3 leading-relaxed">${escapeHTML(program.description)}</p>
        ${
          program.features?.length
            ? `<ul class="mt-4 pt-4 border-t border-slate-100 text-xs space-y-1.5 text-slate-700">
                 ${program.features.map((feature) => `<li><i class="fa-solid fa-check text-brand-gold"></i> ${escapeHTML(feature)}</li>`).join('')}
               </ul>`
            : ''
        }
      </div>
      <a href="#/admissions" class="inline-block text-center gold-button text-brand-darkBlue font-bold px-5 py-2.5 rounded-xl text-xs shadow">
        Apply for this stage
      </a>
    </div>`,
});
