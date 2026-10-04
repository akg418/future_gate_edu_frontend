import { $, $$, escapeHTML, emptyState, skeletonCards, debounce, delegate } from '../core/dom.js';
import { lessonService, mediaService } from '../services/index.js';
import { can } from '../core/permissions.js';
import store from '../core/store.js';
import notify from '../components/toast.js';
import CONFIG from '../core/config.js';

/**
 * Lessons platform (LMS).
 *
 * Filtering is done server-side through the API so the page stays fast as the
 * catalogue grows, instead of filtering an in-memory array as before.
 */

const state = { type: 'all', search: '', grade: 'all', subject: 'all', lessons: [] };

function lessonCard(lesson) {
  const typeBadge =
    lesson.type === 'online'
      ? '<i class="fa-solid fa-video"></i> Video Stream'
      : '<i class="fa-solid fa-file-arrow-down"></i> Resource PDF';

  return `
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-card hover:shadow-cardHover transition flex flex-col justify-between space-y-4">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full ${lesson.type === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'} uppercase">
            ${typeBadge}
          </span>
          <span class="text-xs text-slate-400 font-semibold">${escapeHTML(lesson.grade)}</span>
        </div>
        <h3 class="font-bold text-slate-900 text-base leading-tight">${escapeHTML(lesson.title)}</h3>
        <p class="text-xs text-brand-blue font-semibold mt-1"><i class="fa-solid fa-book"></i> ${escapeHTML(lesson.subject)}</p>
        <p class="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">${escapeHTML(lesson.description)}</p>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
        <button data-launch="${escapeHTML(lesson._id)}" class="bg-brand-blue hover:bg-brand-darkBlue text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
          <i class="fa-solid fa-play"></i> Launch Lesson
        </button>
        <span class="text-[10px] text-slate-400 font-mono">ID: ${escapeHTML(lesson.code)}</span>
      </div>
    </div>`;
}

async function loadLessons() {
  const grid = $('#lessons-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(6, 'h-56');

  try {
    const { items } = await lessonService.list({
      limit: 60,
      search: state.search || undefined,
      type: state.type,
      grade: state.grade,
      subject: state.subject,
    });
    state.lessons = items;

    grid.innerHTML = items.length
      ? items.map(lessonCard).join('')
      : emptyState('No lessons found matching your criteria.', 'fa-magnifying-glass');
  } catch (error) {
    grid.innerHTML = emptyState('Lessons could not be loaded. Please try again.', 'fa-triangle-exclamation');
    notify.fromError(error);
  }
}

/** Fills the grade and subject dropdowns from the values actually in the database. */
async function loadFilterOptions() {
  try {
    const { grades, subjects } = await lessonService.filterOptions();
    const gradeSelect = $('#lesson-grade-filter');
    const subjectSelect = $('#lesson-subject-filter');

    if (gradeSelect) {
      gradeSelect.innerHTML =
        '<option value="all">All Grades</option>' +
        grades.map((grade) => `<option value="${escapeHTML(grade)}">${escapeHTML(grade)}</option>`).join('');
    }
    if (subjectSelect) {
      subjectSelect.innerHTML =
        '<option value="all">All Subjects</option>' +
        subjects.map((subject) => `<option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>`).join('');
    }
  } catch {
    // Whatever options the markup shipped with remain usable.
  }
}

function setActiveTab(type) {
  state.type = type;
  for (const button of $$('[data-lesson-type]')) {
    const active = button.dataset.lessonType === type;
    button.className = active
      ? 'px-4 py-2 rounded-xl text-xs font-bold bg-brand-blue text-white'
      : 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200';
  }
  loadLessons();
}

/** Opens the video player modal for one lesson. */
function openLesson(id) {
  const lesson = state.lessons.find((item) => String(item._id) === String(id));
  if (!lesson) return;

  $('#lesson-modal-title').textContent = lesson.title;
  $('#lesson-modal-grade').textContent = lesson.grade;
  $('#lesson-modal-subject').textContent = lesson.subject;
  $('#lesson-modal-desc').textContent = lesson.description;

  const download = $('#lesson-modal-download');
  if (download) {
    download.href = lesson.pdfUrl || '#';
    download.classList.toggle('opacity-40', !lesson.pdfUrl);
    download.classList.toggle('pointer-events-none', !lesson.pdfUrl);
  }

  const video = $('#lesson-modal-video');
  if (video) {
    video.src = lesson.videoUrl || '';
    if (lesson.videoUrl) video.play().catch(() => {});
  }

  $('#modal-lesson-player')?.classList.remove('hidden');
}

export function closeLesson() {
  const video = $('#lesson-modal-video');
  if (video) {
    video.pause();
    video.src = '';
  }
  $('#modal-lesson-player')?.classList.add('hidden');
}

/** Assignment upload — a real file upload rather than the original placeholder. */
async function handleAssignmentUpload() {
  if (!store.isAuthenticated) {
    notify.warning('Please sign in to upload an assignment.');
    return;
  }
  if (!can('media.upload')) {
    notify.error('You do not have permission to upload files.');
    return;
  }

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.pdf,.doc,.docx,image/*';
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    try {
      const { message } = await mediaService.upload(file, 'assignment');
      notify.success(message || 'Assignment uploaded successfully.');
    } catch (error) {
      notify.fromError(error, 'The assignment could not be uploaded.');
    }
  });
  picker.click();
}

const debouncedSearch = debounce(loadLessons, CONFIG.defaults.searchDebounceMs);

export default {
  async mount(root) {
    Object.assign(state, { type: 'all', search: '', grade: 'all', subject: 'all' });

    $('#lesson-search-input')?.addEventListener('input', (event) => {
      state.search = event.target.value.trim();
      debouncedSearch();
    });
    $('#lesson-grade-filter')?.addEventListener('change', (event) => {
      state.grade = event.target.value;
      loadLessons();
    });
    $('#lesson-subject-filter')?.addEventListener('change', (event) => {
      state.subject = event.target.value;
      loadLessons();
    });

    for (const button of $$('[data-lesson-type]', root)) {
      button.addEventListener('click', () => setActiveTab(button.dataset.lessonType));
    }

    delegate(root, 'click', '[data-launch]', (_event, button) => openLesson(button.dataset.launch));

    $('#lesson-assignment-btn')?.addEventListener('click', handleAssignmentUpload);
    window.closeLessonModal = closeLesson;

    await loadFilterOptions();
    await loadLessons();
  },

  unmount() {
    closeLesson();
    state.lessons = [];
  },
};
