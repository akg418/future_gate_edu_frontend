import { escapeHTML } from '../core/dom.js';

/**
 * Full-screen image viewer for the gallery, replacing the original `alert()`
 * placeholder with a real lightbox.
 */
export function openLightbox(src, title = '') {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[95] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 fg-modal-enter';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title || 'Image preview');
  overlay.innerHTML = `
    <button data-close aria-label="Close preview" class="absolute top-5 right-5 rtl:right-auto rtl:left-5 text-white/80 hover:text-white text-2xl z-10">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <figure class="max-w-5xl w-full text-center space-y-3">
      <img src="${escapeHTML(src)}" alt="${escapeHTML(title)}"
           class="max-h-[78vh] w-auto mx-auto rounded-3xl shadow-2xl object-contain"
           onerror="this.src='assets/img/students-classroom.jpg'" />
      ${title ? `<figcaption class="text-white font-bold text-sm">${escapeHTML(title)}</figcaption>` : ''}
    </figure>`;

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
  };
  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  overlay.querySelector('[data-close]').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);
  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
}

export default openLightbox;
