import { $, escapeHTML, formatDateTime } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { confirmDialog } from '../../components/modal.js';
import { mediaService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/** Media library — files uploaded to the server, listed with their public URLs. */

let table = null;

const formatSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

async function uploadFiles(files) {
  if (!files?.length) return;
  try {
    const { message } = await mediaService.uploadMany(files, 'library');
    notify.success(message);
    table.reload();
  } catch (error) {
    notify.fromError(error, 'The files could not be uploaded.');
  }
}

async function deleteMedia(row) {
  const confirmed = await confirmDialog({
    title: 'Delete this file?',
    message: `"${row.originalName}" will be permanently removed from the server. Any content still referencing it will show a broken image.`,
    confirmLabel: 'Delete File',
  });
  if (!confirmed) return;

  try {
    const message = await mediaService.remove(row._id);
    notify.success(message || 'File deleted.');
    table.reload();
  } catch (error) {
    notify.fromError(error);
  }
}

export default {
  async mount(root) {
    renderAdminNav(root);

    const input = $('#media-file-input');
    $('#upload-media-btn')?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', () => {
      uploadFiles(Array.from(input.files || []));
      input.value = '';
    });

    table = createDataTable({
      mount: $('#media-table', root),
      searchPlaceholder: 'Search by filename or context…',
      emptyMessage: 'No files have been uploaded yet.',
      emptyIcon: 'fa-folder-open',
      filters: [
        {
          key: 'kind',
          options: [
            { value: 'all', label: 'All types' },
            { value: 'image', label: 'Images' },
            { value: 'document', label: 'Documents' },
          ],
        },
      ],
      fetcher: (query) => mediaService.list(query),
      columns: [
        {
          key: 'preview',
          header: 'File',
          render: (row) => `
            <div class="flex items-center gap-2.5 min-w-[12rem]">
              ${
                row.kind === 'image'
                  ? `<img src="${escapeHTML(row.url)}" alt="" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />`
                  : '<span class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-file"></i></span>'
              }
              <div class="min-w-0">
                <p class="font-bold text-slate-900 truncate">${escapeHTML(row.originalName)}</p>
                <p class="text-[11px] text-slate-500 truncate font-mono">${escapeHTML(row.filename)}</p>
              </div>
            </div>`,
        },
        { key: 'kind', header: 'Type', render: (row) => statusBadge(row.kind, row.kind === 'image' ? 'blue' : 'slate') },
        { key: 'context', header: 'Context', className: 'text-slate-600' },
        { key: 'size', header: 'Size', className: 'text-slate-500 whitespace-nowrap', render: (row) => escapeHTML(formatSize(row.size)) },
        { key: 'createdAt', header: 'Uploaded', className: 'text-slate-500 whitespace-nowrap', render: (row) => escapeHTML(formatDateTime(row.createdAt)) },
        {
          key: 'actions',
          header: 'Actions',
          className: 'whitespace-nowrap',
          render: (row) => `
            <div class="flex items-center gap-1">
              <a href="${escapeHTML(row.url)}" target="_blank" rel="noopener" class="bg-blue-50 text-brand-blue px-2.5 py-1 rounded-lg hover:bg-blue-100 font-bold" title="Open file">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
              <button data-action="copy" class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200 font-bold" title="Copy URL">
                <i class="fa-solid fa-copy"></i>
              </button>
              ${can('media.delete') ? '<button data-action="delete" class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 font-bold" title="Delete file"><i class="fa-solid fa-trash"></i></button>' : ''}
            </div>`,
        },
      ],
      actions: {
        async copy(row) {
          try {
            await navigator.clipboard.writeText(row.url);
            notify.success('File URL copied to the clipboard.');
          } catch {
            notify.info(row.url, 10000);
          }
        },
        delete: (row) => deleteMedia(row),
      },
    });
  },

  unmount() {
    table = null;
  },
};
