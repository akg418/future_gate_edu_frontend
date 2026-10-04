import { $, escapeHTML } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { lessonService, mediaService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/**
 * Lessons CMS.
 *
 * Replaces the original `prompt()`-driven "add lesson" flow with a proper form,
 * including an upload that puts the video or PDF on the server.
 */

const GRADES = ['Kindergarten', 'Primary', 'Preparatory', 'Secondary'];
let table = null;

async function openLessonForm(existing = null) {
  const isEdit = Boolean(existing);

  await openModal({
    title: isEdit ? `Edit — ${existing.title}` : 'Add New Lesson',
    icon: 'fa-chalkboard-user',
    size: 'max-w-2xl',
    body: `
      <form id="lesson-form" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Lesson Title *</label>
          <input name="title" required minlength="3" value="${escapeHTML(existing?.title || '')}" class="w-full p-2.5 rounded-xl border border-slate-300" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Grade *</label>
            <select name="grade" required class="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
              ${GRADES.map((grade) => `<option value="${grade}" ${grade === existing?.grade ? 'selected' : ''}>${grade}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Subject *</label>
            <input name="subject" required list="subject-options" value="${escapeHTML(existing?.subject || '')}" class="w-full p-2.5 rounded-xl border border-slate-300" />
            <datalist id="subject-options">
              ${['Mathematics', 'Science', 'English', 'German', 'Arabic', 'Technology'].map((subject) => `<option value="${subject}"></option>`).join('')}
            </datalist>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Type</label>
            <select name="type" class="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
              <option value="online" ${existing?.type !== 'offline' ? 'selected' : ''}>Online (video stream)</option>
              <option value="offline" ${existing?.type === 'offline' ? 'selected' : ''}>Offline (downloadable)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Description</label>
          <textarea name="description" rows="3" class="w-full p-2.5 rounded-xl border border-slate-300">${escapeHTML(existing?.description || '')}</textarea>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Video URL</label>
          <input name="videoUrl" type="url" value="${escapeHTML(existing?.videoUrl || '')}" placeholder="https://…" class="w-full p-2.5 rounded-xl border border-slate-300" />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Resource PDF</label>
          <div class="flex items-center gap-2">
            <input name="pdfUrl" type="url" value="${escapeHTML(existing?.pdfUrl || '')}" placeholder="https://… or upload" class="flex-1 p-2.5 rounded-xl border border-slate-300" />
            ${can('media.upload') ? '<button type="button" data-upload-pdf class="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold whitespace-nowrap"><i class="fa-solid fa-cloud-arrow-up"></i> Upload</button>' : ''}
          </div>
        </div>

        <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
          <input type="checkbox" name="isPublished" ${existing?.isPublished !== false ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-brand-blue" />
          <span class="font-semibold text-slate-800">Published — visible on the public Lessons page</span>
        </label>
      </form>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
      <button data-save class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">${isEdit ? 'Save Changes' : 'Create Lesson'}</button>`,

    onMount(overlay, close) {
      overlay.querySelector('[data-upload-pdf]')?.addEventListener('click', () => {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.pdf,.doc,.docx';
        picker.addEventListener('change', async () => {
          const file = picker.files?.[0];
          if (!file) return;
          try {
            const { data } = await mediaService.upload(file, 'lesson-resource');
            overlay.querySelector('[name="pdfUrl"]').value = data.url;
            notify.success('File uploaded and linked to this lesson.');
          } catch (error) {
            notify.fromError(error);
          }
        });
        picker.click();
      });

      overlay.querySelector('[data-save]').addEventListener('click', async () => {
        const form = overlay.querySelector('#lesson-form');
        if (!form.reportValidity()) return;

        const payload = {
          title: form.title.value.trim(),
          grade: form.grade.value,
          subject: form.subject.value.trim(),
          type: form.type.value,
          description: form.description.value.trim(),
          videoUrl: form.videoUrl.value.trim(),
          pdfUrl: form.pdfUrl.value.trim(),
          isPublished: form.isPublished.checked,
        };

        try {
          const result = isEdit ? await lessonService.update(existing._id, payload) : await lessonService.create(payload);
          notify.success(result.message);
          close(true);
          table.reload();
        } catch (error) {
          notify.fromError(error);
        }
      });
    },
  });
}

async function togglePublished(row) {
  try {
    const { message } = await lessonService.setPublished(row._id, !row.isPublished);
    notify.success(message);
    table.reload();
  } catch (error) {
    notify.fromError(error);
  }
}

async function deleteLesson(row) {
  const confirmed = await confirmDialog({
    title: 'Delete this lesson?',
    message: `"${row.title}" will be permanently removed from the LMS.`,
    confirmLabel: 'Delete Lesson',
  });
  if (!confirmed) return;

  try {
    const message = await lessonService.remove(row._id);
    notify.success(message || 'Lesson deleted.');
    table.reload();
  } catch (error) {
    notify.fromError(error);
  }
}

export default {
  async mount(root) {
    renderAdminNav(root);
    $('#add-lesson-btn')?.addEventListener('click', () => openLessonForm());

    table = createDataTable({
      mount: $('#lessons-table', root),
      searchPlaceholder: 'Search by title, subject or code…',
      emptyMessage: 'No lessons have been created yet.',
      emptyIcon: 'fa-chalkboard-user',
      filters: [
        { key: 'grade', options: [{ value: 'all', label: 'All grades' }, ...GRADES.map((grade) => ({ value: grade, label: grade }))] },
        {
          key: 'type',
          options: [
            { value: 'all', label: 'All types' },
            { value: 'online', label: 'Online' },
            { value: 'offline', label: 'Offline' },
          ],
        },
      ],
      // `includeDrafts` asks the API for unpublished rows too; the server only
      // honours it for callers holding `lessons.read`.
      fetcher: (query) => lessonService.list({ ...query, includeDrafts: 'true' }),
      columns: [
        { key: 'code', header: 'Code', className: 'font-mono font-bold text-brand-blue whitespace-nowrap' },
        {
          key: 'title',
          header: 'Lesson',
          render: (row) => `
            <div class="max-w-xs">
              <p class="font-bold text-slate-900 truncate">${escapeHTML(row.title)}</p>
              <p class="text-[11px] text-slate-500 truncate">${escapeHTML(row.description)}</p>
            </div>`,
        },
        { key: 'grade', header: 'Grade', className: 'text-slate-600' },
        { key: 'subject', header: 'Subject', className: 'text-brand-blue font-semibold' },
        { key: 'type', header: 'Type', render: (row) => statusBadge(row.type, row.type === 'online' ? 'emerald' : 'blue') },
        { key: 'isPublished', header: 'Status', render: (row) => statusBadge(row.isPublished ? 'Published' : 'Draft', row.isPublished ? 'emerald' : 'slate') },
        {
          key: 'actions',
          header: 'Actions',
          className: 'whitespace-nowrap',
          render: (row) => {
            const buttons = [];
            if (can('lessons.publish')) {
              buttons.push(`<button data-action="publish" class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200 font-bold" title="${row.isPublished ? 'Unpublish' : 'Publish'}"><i class="fa-solid ${row.isPublished ? 'fa-eye-slash' : 'fa-eye'}"></i></button>`);
            }
            if (can('lessons.update')) {
              buttons.push('<button data-action="edit" class="bg-blue-50 text-brand-blue px-2.5 py-1 rounded-lg hover:bg-blue-100 font-bold"><i class="fa-solid fa-pen"></i> Edit</button>');
            }
            if (can('lessons.delete')) {
              buttons.push('<button data-action="delete" class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 font-bold"><i class="fa-solid fa-trash"></i></button>');
            }
            return `<div class="flex items-center gap-1">${buttons.join('') || '<span class="text-[10px] text-slate-400">—</span>'}</div>`;
          },
        },
      ],
      actions: {
        publish: (row) => togglePublished(row),
        edit: (row) => openLessonForm(row),
        delete: (row) => deleteLesson(row),
      },
    });
  },

  unmount() {
    table = null;
  },
};
