import { createListPage } from './listPage.js';
import { newsService } from '../services/index.js';
import { escapeHTML } from '../core/dom.js';
import { locale } from '../core/i18n.js';
import CONFIG from '../core/config.js';
import { openModal } from '../components/modal.js';

/** News listing. Clicking an article opens the full text in a modal. */
const page = createListPage({
  containerId: 'news-full-container',
  service: newsService,
  query: { limit: 60, sort: '-publishedAt' },
  emptyMessage: 'No news articles published yet.',
  emptyIcon: 'fa-newspaper',
  card: (item) => `
    <article class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-card hover:shadow-cardHover transition">
      <img src="${escapeHTML(item.image || CONFIG.fallbackImage)}" alt="${escapeHTML(item.title)}"
           class="w-full h-48 object-cover" onerror="this.src='${CONFIG.fallbackImage}'" />
      <div class="p-6 space-y-3">
        <div class="flex justify-between items-center text-xs text-slate-400">
          <span class="bg-blue-50 text-brand-blue font-bold px-2.5 py-1 rounded-md">${escapeHTML(item.category)}</span>
          <span>${escapeHTML(new Date(item.publishedAt).toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' }))}</span>
        </div>
        <h3 class="font-bold text-slate-900 text-base leading-snug">${escapeHTML(item.title)}</h3>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHTML(item.summary)}</p>
        <button data-article="${escapeHTML(item._id)}" class="text-xs font-bold text-brand-blue hover:text-brand-gold transition">Read Full Article &rarr;</button>
      </div>
    </article>`,

  onRendered(container, items) {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-article]');
      if (!button) return;
      const article = items.find((item) => String(item._id) === button.dataset.article);
      if (!article) return;

      openModal({
        title: article.title,
        icon: 'fa-newspaper',
        size: 'max-w-2xl',
        body: `
          ${article.image ? `<img src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}" class="w-full h-56 object-cover rounded-2xl mb-4" onerror="this.src='${CONFIG.fallbackImage}'" />` : ''}
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <span class="bg-blue-50 text-brand-blue font-bold px-2.5 py-1 rounded-md">${escapeHTML(article.category)}</span>
            <span>${escapeHTML(new Date(article.publishedAt).toLocaleDateString(locale(), { day: '2-digit', month: 'long', year: 'numeric' }))}</span>
          </div>
          <p class="font-semibold text-slate-800 leading-relaxed mb-3">${escapeHTML(article.summary)}</p>
          <p class="leading-relaxed whitespace-pre-line text-slate-600">${escapeHTML(article.content || '')}</p>`,
        footer: '<button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>',
      });
    });
  },
});

export default page;
