import { createListPage } from './listPage.js';
import { eventService } from '../services/index.js';
import { escapeHTML } from '../core/dom.js';
import notify from '../components/toast.js';

/** Upcoming school events. */
const page = createListPage({
  containerId: 'events-full-container',
  service: eventService,
  query: { limit: 60, sort: 'startDate' },
  emptyMessage: 'No upcoming events scheduled.',
  emptyIcon: 'fa-calendar-days',
  card: (event) => `
    <div class="bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
      <div class="flex items-center justify-between">
        <div class="w-14 h-14 rounded-2xl bg-brand-darkBlue text-white flex flex-col items-center justify-center font-display">
          <span class="text-base font-black text-brand-gold leading-none">${escapeHTML(event.day)}</span>
          <span class="text-[10px] font-bold uppercase mt-1">${escapeHTML(event.month)}</span>
        </div>
        ${event.time ? `<span class="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full"><i class="fa-solid fa-clock"></i> ${escapeHTML(event.time)}</span>` : ''}
      </div>
      <div>
        <h3 class="font-bold text-slate-900 text-base">${escapeHTML(event.title)}</h3>
        <p class="text-xs text-slate-500 mt-1">${escapeHTML(event.subtitle)}</p>
      </div>
      <div class="pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2">
        <span><i class="fa-solid fa-location-dot text-brand-gold"></i> ${escapeHTML(event.location || 'School Campus')}</span>
        <button data-rsvp="${escapeHTML(event.title)}" class="text-brand-blue font-bold hover:underline">RSVP Now</button>
      </div>
    </div>`,

  onRendered(container) {
    container.addEventListener('click', (clickEvent) => {
      const button = clickEvent.target.closest('[data-rsvp]');
      if (!button) return;
      notify.success(`Your interest in "${button.dataset.rsvp}" has been noted. Our team will contact you with details.`, 6000);
    });
  },
});

export default page;
