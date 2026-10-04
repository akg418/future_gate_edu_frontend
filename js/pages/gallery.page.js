import { createListPage } from './listPage.js';
import { galleryService } from '../services/index.js';
import { escapeHTML } from '../core/dom.js';
import openLightbox from '../components/lightbox.js';
import CONFIG from '../core/config.js';

/** Photo gallery with a full-screen lightbox. */
const page = createListPage({
  containerId: 'gallery-full-container',
  service: galleryService,
  query: { limit: 100, sort: 'order' },
  emptyMessage: 'No photos have been published yet.',
  emptyIcon: 'fa-images',
  skeletonCount: 8,
  card: (item) => `
    <button data-lightbox="${escapeHTML(item.image)}" data-title="${escapeHTML(item.title)}"
            class="rounded-3xl overflow-hidden shadow-card border border-slate-200 group relative cursor-pointer text-left">
      <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}"
           class="w-full h-48 object-cover group-hover:scale-110 transition duration-500" onerror="this.src='${CONFIG.fallbackImage}'" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition p-4 flex flex-col justify-end text-white">
        <h4 class="font-bold text-xs">${escapeHTML(item.title)}</h4>
        <p class="text-[10px] text-white/70">${escapeHTML(item.category)}</p>
      </div>
    </button>`,

  onRendered(container) {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lightbox]');
      if (button) openLightbox(button.dataset.lightbox, button.dataset.title);
    });
  },
});

export default page;
