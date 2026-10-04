import { $, escapeHTML, emptyState, skeletonCards, withButtonLoading, formData, applyCmsText } from '../core/dom.js';
import { locale } from '../core/i18n.js';
import { newsService, eventService, galleryService, testimonialService, applicationService, settingService } from '../services/index.js';
import notify from '../components/toast.js';
import openLightbox from '../components/lightbox.js';
import CONFIG from '../core/config.js';

/**
 * Home page controller.
 *
 * Every section that used to read a hardcoded array now fetches from the API:
 * news, events, gallery and testimonials, plus the CMS-managed hero copy. The
 * quick enquiry form posts a real admission application.
 */

let carouselTimer = null;
let testimonials = [];

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

async function renderHeroContent() {
  try {
    const settings = await settingService.getPublic();
    const site = settings.site || {};
    applyCmsText($('#cms-hero-headline'), site.heroTitle);
    applyCmsText($('#cms-hero-desc'), site.heroDescription);
  } catch {
    // The markup already contains sensible default copy.
  }
}

async function renderNews() {
  const container = $('#home-news-container');
  if (!container) return;
  container.innerHTML = skeletonCards(3, 'h-20');

  try {
    const { items } = await newsService.list({ limit: 3, sort: '-publishedAt' });
    if (!items.length) return void (container.innerHTML = emptyState('No news published yet.', 'fa-newspaper'));

    container.innerHTML = items
      .map(
        (item) => `
      <a href="#/news" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-gold transition cursor-pointer">
        <img src="${escapeHTML(item.image || CONFIG.fallbackImage)}" alt="${escapeHTML(item.title)}"
             class="w-16 h-16 rounded-xl object-cover shrink-0" onerror="this.src='${CONFIG.fallbackImage}'" />
        <div class="space-y-1">
          <span class="text-[10px] font-bold bg-blue-100 text-brand-blue px-2 py-0.5 rounded-md">${escapeHTML(item.category)}</span>
          <h4 class="font-bold text-slate-900 text-xs line-clamp-1 hover:text-brand-blue transition">${escapeHTML(item.title)}</h4>
          <p class="text-[11px] text-slate-500">${escapeHTML(dateLabel(item.publishedAt))}</p>
        </div>
      </a>`,
      )
      .join('');
  } catch {
    container.innerHTML = emptyState('News could not be loaded.', 'fa-triangle-exclamation');
  }
}

async function renderEvents() {
  const container = $('#home-events-container');
  if (!container) return;
  container.innerHTML = skeletonCards(3, 'h-16');

  try {
    const { items } = await eventService.list({ limit: 3, sort: 'startDate' });
    if (!items.length) return void (container.innerHTML = emptyState('No upcoming events.', 'fa-calendar'));

    container.innerHTML = items
      .map(
        (event) => `
      <a href="#/events" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-gold transition">
        <div class="w-12 h-12 rounded-xl bg-brand-darkBlue text-white flex flex-col items-center justify-center shrink-0">
          <span class="text-xs font-black text-brand-gold leading-none">${escapeHTML(event.day)}</span>
          <span class="text-[9px] font-bold uppercase leading-none mt-0.5">${escapeHTML(event.month)}</span>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 text-xs">${escapeHTML(event.title)}</h4>
          <p class="text-[11px] text-slate-500"><i class="fa-solid fa-location-dot text-brand-gold"></i> ${escapeHTML(event.location || 'Campus')} &bull; ${escapeHTML(event.time || '')}</p>
        </div>
      </a>`,
      )
      .join('');
  } catch {
    container.innerHTML = emptyState('Events could not be loaded.', 'fa-triangle-exclamation');
  }
}

async function renderGallery() {
  const grid = $('#home-gallery-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(4, 'h-24');

  try {
    const { items } = await galleryService.list({ limit: 4, sort: 'order' });
    if (!items.length) return void (grid.innerHTML = emptyState('No photos yet.', 'fa-images'));

    grid.innerHTML = items
      .map(
        (item) => `
      <button data-lightbox="${escapeHTML(item.image)}" data-title="${escapeHTML(item.title)}"
              class="rounded-2xl overflow-hidden shadow-sm border border-slate-200 group relative cursor-pointer">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}"
             class="w-full h-24 object-cover group-hover:scale-110 transition duration-500" onerror="this.src='${CONFIG.fallbackImage}'" />
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
          <i class="fa-solid fa-expand text-lg"></i>
        </div>
      </button>`,
      )
      .join('');

    grid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lightbox]');
      if (button) openLightbox(button.dataset.lightbox, button.dataset.title);
    });
  } catch {
    grid.innerHTML = emptyState('Gallery could not be loaded.', 'fa-triangle-exclamation');
  }
}

function showTestimonial(index) {
  const item = testimonials[index];
  if (!item) return;
  const text = $('#testimonial-text');
  const author = $('#testimonial-author');
  const role = $('#testimonial-role');
  if (text) text.textContent = item.text;
  if (author) author.textContent = item.author;
  if (role) role.textContent = item.role;

  document.querySelectorAll('.t-dot').forEach((dot, dotIndex) => {
    dot.className = `t-dot w-3 h-3 rounded-full ${dotIndex === index ? 'bg-brand-blue' : 'bg-slate-300'}`;
  });
}

async function renderTestimonials() {
  try {
    const { items } = await testimonialService.list({ limit: 3, sort: 'order' });
    if (!items.length) return;
    testimonials = items;
    showTestimonial(0);

    // Auto-advance, cleared on unmount so it cannot leak across routes.
    let index = 0;
    carouselTimer = setInterval(() => {
      index = (index + 1) % testimonials.length;
      showTestimonial(index);
    }, 7000);
  } catch {
    // The markup keeps its default quote if the request fails.
  }
}

/** Quick enquiry form on the home page — creates a real admission application. */
async function handleQuickApply(event) {
  event.preventDefault();
  const form = event.target;
  const restore = withButtonLoading($('#cta-submit-btn'), 'Submitting…');

  try {
    const values = formData(form);
    const { data, message } = await applicationService.submit({ ...values, source: 'quick-form' });
    notify.success(message, 8000);
    form.reset();
    // Surface the reference the family needs for the status tracker.
    notify.info(`Keep your reference ID: ${data.refId}`, 12000);
  } catch (error) {
    notify.fromError(error, 'Your application could not be submitted.');
  } finally {
    restore();
  }
}

export default {
  async mount(root) {
    $('#cta-quick-form')?.addEventListener('submit', handleQuickApply);
    document.querySelectorAll('.t-dot').forEach((dot, index) => dot.addEventListener('click', () => showTestimonial(index)));

    await Promise.all([renderHeroContent(), renderNews(), renderEvents(), renderGallery(), renderTestimonials()]);
  },

  unmount() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = null;
    testimonials = [];
  },
};
