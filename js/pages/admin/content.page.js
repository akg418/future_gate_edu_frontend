import { $, escapeHTML, formatDate, toDateInputValue } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { contentServices, mediaService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/**
 * Content Manager — one screen managing every publishable content type.
 *
 * Each type declares its columns and form fields in the table below, so adding
 * a new content type here is a data change rather than a new page.
 */

/** Field descriptors used to build both the table and the edit form. */
const TYPES = {
  news: {
    label: 'News', icon: 'fa-newspaper', module: 'news',
    columns: ['title', 'category', 'publishedAt'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 2 },
      { name: 'content', label: 'Full Article', type: 'textarea', rows: 5 },
      { name: 'image', label: 'Cover Image', type: 'image' },
      { name: 'publishedAt', label: 'Publish Date', type: 'date' },
    ],
  },
  events: {
    label: 'Events', icon: 'fa-calendar-days', module: 'events',
    columns: ['title', 'location', 'startDate'],
    fields: [
      { name: 'title', label: 'Event Title', type: 'text', required: true },
      { name: 'subtitle', label: 'Subtitle', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'startDate', label: 'Date', type: 'date', required: true },
      { name: 'time', label: 'Time', type: 'text', placeholder: '10:00 AM' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'image', label: 'Image', type: 'image' },
    ],
  },
  gallery: {
    label: 'Gallery', icon: 'fa-images', module: 'gallery',
    columns: ['title', 'category', 'createdAt'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'image', label: 'Photo', type: 'image', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'order', label: 'Display Order', type: 'number' },
    ],
  },
  teachers: {
    label: 'Teachers', icon: 'fa-user-tie', module: 'teachers', labelField: 'name',
    columns: ['name', 'subject', 'title'],
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'title', label: 'Job Title', type: 'text' },
      { name: 'subject', label: 'Subject', type: 'text' },
      { name: 'experience', label: 'Experience', type: 'text', placeholder: '12 Yrs' },
      { name: 'bio', label: 'Biography', type: 'textarea', rows: 3 },
      { name: 'image', label: 'Portrait', type: 'image' },
      { name: 'order', label: 'Display Order', type: 'number' },
    ],
  },
  calendar: {
    label: 'Calendar', icon: 'fa-calendar', module: 'calendar',
    columns: ['title', 'type', 'date'],
    fields: [
      { name: 'title', label: 'Entry Title', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['Exam', 'Event', 'Holiday', 'Term', 'Other'] },
      { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
    ],
  },
  programs: {
    label: 'Programs', icon: 'fa-graduation-cap', module: 'programs',
    columns: ['title', 'stage', 'gradeRange'],
    fields: [
      { name: 'title', label: 'Program Title', type: 'text', required: true },
      { name: 'stage', label: 'Stage', type: 'select', options: ['Kindergarten', 'Primary', 'Preparatory', 'Secondary', 'Special'], required: true },
      { name: 'ageRange', label: 'Age Range', type: 'text', placeholder: '6 – 12 years' },
      { name: 'gradeRange', label: 'Grade Range', type: 'text', placeholder: 'Grades 1 – 6' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'icon', label: 'Icon Class', type: 'text', placeholder: 'fa-solid fa-book-open-reader' },
      { name: 'features', label: 'Features (one per line)', type: 'lines', rows: 4 },
      { name: 'order', label: 'Display Order', type: 'number' },
    ],
  },
  testimonials: {
    label: 'Testimonials', icon: 'fa-quote-left', module: 'testimonials', labelField: 'author',
    columns: ['author', 'role', 'rating'],
    fields: [
      { name: 'text', label: 'Testimonial', type: 'textarea', rows: 3, required: true },
      { name: 'author', label: 'Author', type: 'text', required: true },
      { name: 'role', label: 'Role', type: 'text', placeholder: 'Parent of Grade 4 Student' },
      { name: 'rating', label: 'Rating (1–5)', type: 'number' },
      { name: 'order', label: 'Display Order', type: 'number' },
    ],
  },
};

const COLUMN_LABELS = {
  title: 'Title', name: 'Name', author: 'Author', category: 'Category', subject: 'Subject',
  location: 'Location', stage: 'Stage', gradeRange: 'Grades', type: 'Type', role: 'Role',
  rating: 'Rating', publishedAt: 'Published', startDate: 'Date', date: 'Date', createdAt: 'Created',
};

let table = null;
let activeType = 'news';

const definition = () => TYPES[activeType];
const service = () => contentServices[activeType].service;

/* ------------------------------- Form builder ------------------------------ */

function fieldMarkup(field, value) {
  const required = field.required ? 'required' : '';
  const common = 'w-full p-2.5 rounded-xl border border-slate-300';

  switch (field.type) {
    case 'textarea':
      return `<textarea name="${field.name}" rows="${field.rows || 3}" ${required} class="${common}">${escapeHTML(value || '')}</textarea>`;
    case 'lines':
      return `<textarea name="${field.name}" rows="${field.rows || 3}" class="${common} font-mono text-[11px]">${escapeHTML(Array.isArray(value) ? value.join('\n') : value || '')}</textarea>`;
    case 'select':
      return `<select name="${field.name}" ${required} class="${common} font-semibold">
                ${field.options.map((option) => `<option value="${escapeHTML(option)}" ${option === value ? 'selected' : ''}>${escapeHTML(option)}</option>`).join('')}
              </select>`;
    case 'date':
      return `<input type="date" name="${field.name}" ${required} value="${escapeHTML(toDateInputValue(value))}" class="${common}" />`;
    case 'number':
      return `<input type="number" name="${field.name}" value="${escapeHTML(value ?? '')}" class="${common}" />`;
    case 'image':
      return `
        <div class="flex items-center gap-2">
          <input type="text" name="${field.name}" ${required} value="${escapeHTML(value || '')}" placeholder="Image URL or upload" class="flex-1 p-2.5 rounded-xl border border-slate-300" />
          ${can('media.upload') ? `<button type="button" data-upload-for="${field.name}" class="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold whitespace-nowrap"><i class="fa-solid fa-cloud-arrow-up"></i> Upload</button>` : ''}
        </div>
        ${value ? `<img src="${escapeHTML(value)}" alt="" class="mt-2 h-20 rounded-xl object-cover border border-slate-200" />` : ''}`;
    default:
      return `<input type="text" name="${field.name}" ${required} value="${escapeHTML(value ?? '')}" placeholder="${escapeHTML(field.placeholder || '')}" class="${common}" />`;
  }
}

async function openContentForm(existing = null) {
  const spec = definition();
  const isEdit = Boolean(existing);

  await openModal({
    title: isEdit ? `Edit ${spec.label.replace(/s$/, '')}` : `Add ${spec.label.replace(/s$/, '')}`,
    icon: spec.icon,
    size: 'max-w-2xl',
    body: `
      <form id="content-form" class="space-y-3 text-xs">
        ${spec.fields
          .map(
            (field) => `
          <div>
            <label class="block font-semibold text-slate-700 mb-1">${escapeHTML(field.label)}${field.required ? ' *' : ''}</label>
            ${fieldMarkup(field, existing?.[field.name])}
          </div>`,
          )
          .join('')}
        <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
          <input type="checkbox" name="isPublished" ${existing?.isPublished !== false ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-brand-blue" />
          <span class="font-semibold text-slate-800">Published — visible on the public website</span>
        </label>
      </form>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
      <button data-save class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">${isEdit ? 'Save Changes' : 'Create'}</button>`,

    onMount(overlay, close) {
      // Inline uploads for any image field.
      for (const button of overlay.querySelectorAll('[data-upload-for]')) {
        button.addEventListener('click', () => {
          const picker = document.createElement('input');
          picker.type = 'file';
          picker.accept = 'image/*';
          picker.addEventListener('change', async () => {
            const file = picker.files?.[0];
            if (!file) return;
            try {
              const { data } = await mediaService.upload(file, `${activeType}-image`);
              overlay.querySelector(`[name="${button.dataset.uploadFor}"]`).value = data.url;
              notify.success('Image uploaded successfully.');
            } catch (error) {
              notify.fromError(error);
            }
          });
          picker.click();
        });
      }

      overlay.querySelector('[data-save]').addEventListener('click', async () => {
        const form = overlay.querySelector('#content-form');
        if (!form.reportValidity()) return;

        const payload = { isPublished: form.isPublished.checked };
        for (const field of spec.fields) {
          const input = form.elements[field.name];
          if (!input) continue;
          let value = input.value;
          if (field.type === 'lines') value = value.split('\n').map((line) => line.trim()).filter(Boolean);
          else if (field.type === 'number') value = value === '' ? undefined : Number(value);
          else value = typeof value === 'string' ? value.trim() : value;
          if (value !== '' && value !== undefined) payload[field.name] = value;
        }

        try {
          const result = isEdit ? await service().update(existing._id, payload) : await service().create(payload);
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

async function deleteItem(row) {
  const spec = definition();
  const label = row[spec.labelField || 'title'] || 'this item';
  const confirmed = await confirmDialog({
    title: `Delete ${spec.label.replace(/s$/, '').toLowerCase()}?`,
    message: `"${label}" will be permanently removed.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) return;

  try {
    const message = await service().remove(row._id);
    notify.success(message || 'Deleted successfully.');
    table.reload();
  } catch (error) {
    notify.fromError(error);
  }
}

/* --------------------------------- Table ----------------------------------- */

function cellValue(row, key) {
  const value = row[key];
  if (value === undefined || value === null || value === '') return '—';
  if (['publishedAt', 'startDate', 'date', 'createdAt'].includes(key)) return formatDate(value);
  return String(value);
}

function buildTable(root) {
  const spec = definition();
  const module = spec.module;

  $('#content-title').textContent = spec.label;
  const addButton = $('#add-content-btn');
  if (addButton) {
    addButton.hidden = !can(`${module}.create`);
    addButton.innerHTML = `<i class="fa-solid fa-plus"></i> Add ${spec.label.replace(/s$/, '')}`;
  }

  table = createDataTable({
    mount: $('#content-table', root),
    searchPlaceholder: `Search ${spec.label.toLowerCase()}…`,
    emptyMessage: `No ${spec.label.toLowerCase()} have been added yet.`,
    emptyIcon: spec.icon,
    fetcher: (query) => service().list({ ...query, includeDrafts: 'true' }),
    columns: [
      ...spec.columns.map((key, index) => ({
        key,
        header: COLUMN_LABELS[key] || key,
        className: index === 0 ? 'font-bold text-slate-900 max-w-xs truncate' : 'text-slate-600',
        render: (row) => escapeHTML(cellValue(row, key)),
      })),
      { key: 'isPublished', header: 'Status', render: (row) => statusBadge(row.isPublished ? 'Published' : 'Draft', row.isPublished ? 'emerald' : 'slate') },
      {
        key: 'actions',
        header: 'Actions',
        className: 'whitespace-nowrap',
        render: () => {
          const buttons = [];
          if (can(`${module}.update`)) buttons.push('<button data-action="edit" class="bg-blue-50 text-brand-blue px-2.5 py-1 rounded-lg hover:bg-blue-100 font-bold"><i class="fa-solid fa-pen"></i> Edit</button>');
          if (can(`${module}.delete`)) buttons.push('<button data-action="delete" class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 font-bold"><i class="fa-solid fa-trash"></i></button>');
          return `<div class="flex items-center gap-1">${buttons.join('') || '<span class="text-[10px] text-slate-400">—</span>'}</div>`;
        },
      },
    ],
    actions: {
      edit: (row) => openContentForm(row),
      delete: (row) => deleteItem(row),
    },
  });
}

function renderTypeTabs(root) {
  const tabs = $('#content-type-tabs', root);
  if (!tabs) return;

  // Only offer content types the user may at least read.
  const available = Object.entries(TYPES).filter(([, spec]) => can(`${spec.module}.read`) || can(`${spec.module}.update`) || can(`${spec.module}.create`));
  const usable = available.length ? available : Object.entries(TYPES);
  if (!usable.some(([key]) => key === activeType)) activeType = usable[0][0];

  tabs.innerHTML = usable
    .map(
      ([key, spec]) => `
    <button data-content-type="${key}" class="px-4 py-2 rounded-xl transition ${key === activeType ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
      <i class="fa-solid ${escapeHTML(spec.icon)}"></i> ${escapeHTML(spec.label)}
    </button>`,
    )
    .join('');

  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-content-type]');
    if (!button || button.dataset.contentType === activeType) return;
    activeType = button.dataset.contentType;
    renderTypeTabs(root);
    buildTable(root);
  });
}

export default {
  async mount(root) {
    renderAdminNav(root);
    $('#add-content-btn')?.addEventListener('click', () => openContentForm());
    renderTypeTabs(root);
    buildTable(root);
  },

  unmount() {
    table = null;
  },
};
