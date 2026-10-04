import { $, escapeHTML, formatDate } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { applicationService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/** Admission applications: review, change status and inspect uploaded documents. */

const STATUS_TONE = { Approved: 'emerald', Rejected: 'rose', 'Under Review': 'blue', Pending: 'amber' };
const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected'];

let table = null;

async function refreshStatistics() {
  try {
    const stats = await applicationService.statistics();
    $('#app-stat-total').textContent = stats.total;
    $('#app-stat-pending').textContent = stats.pending;
    $('#app-stat-approved').textContent = stats.approved;
    $('#app-stat-rejected').textContent = stats.rejected;
  } catch {
    // Counters are supplementary.
  }
}

async function changeStatus(row, status) {
  try {
    const { message } = await applicationService.changeStatus(row._id, status);
    notify.success(message);
    table.reload();
    refreshStatistics();
  } catch (error) {
    notify.fromError(error);
  }
}

async function viewApplication(row) {
  const application = await applicationService.get(row._id).catch(() => row);

  await openModal({
    title: `Application ${application.refId}`,
    icon: 'fa-file-signature',
    size: 'max-w-2xl',
    body: `
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          ${[
            ['Student Name', application.studentName],
            ['Parent Name', application.parentName],
            ['Grade Level', application.grade],
            ['Phone', application.phone],
            ['Email', application.email],
            ['Date of Birth', application.dateOfBirth ? formatDate(application.dateOfBirth) : '—'],
            ['Gender', application.gender || '—'],
            ['National ID', application.nationalId || '—'],
            ['Submitted', formatDate(application.createdAt)],
            ['Source', application.source],
          ]
            .map(
              ([label, value]) => `
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-[10px] uppercase font-bold text-slate-400">${escapeHTML(label)}</p>
              <p class="font-semibold text-slate-800 break-words">${escapeHTML(value ?? '—')}</p>
            </div>`,
            )
            .join('')}
        </div>

        ${
          application.notes
            ? `<div><p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Notes</p>
                 <p class="p-3 rounded-xl bg-white border border-slate-200 whitespace-pre-line">${escapeHTML(application.notes)}</p></div>`
            : ''
        }

        <div>
          <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Uploaded Documents</p>
          ${
            application.documents?.length
              ? `<div class="flex flex-wrap gap-2">${application.documents
                  .map(
                    (document) => `
                <a href="${escapeHTML(document.url)}" target="_blank" rel="noopener"
                   class="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-brand-blue hover:bg-blue-100 font-bold text-[11px]">
                  <i class="fa-solid fa-paperclip"></i> ${escapeHTML(document.kind)} <span class="text-slate-400 font-normal">(${escapeHTML(document.originalName)})</span>
                </a>`,
                  )
                  .join('')}</div>`
              : '<p class="text-xs text-slate-400">No documents were uploaded with this application.</p>'
          }
        </div>
      </div>`,
    footer: `
      ${
        can('applications.change-status')
          ? `<select data-status-select class="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold mr-auto rtl:mr-0 rtl:ml-auto">
               ${STATUSES.map((status) => `<option value="${status}" ${status === application.status ? 'selected' : ''}>${status}</option>`).join('')}
             </select>`
          : ''
      }
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>`,
    onMount(overlay) {
      overlay.querySelector('[data-status-select]')?.addEventListener('change', (event) => changeStatus(application, event.target.value));
    },
  });
}

async function deleteApplication(row) {
  const confirmed = await confirmDialog({
    title: 'Delete this application?',
    message: `Application ${row.refId} for ${row.studentName} will be permanently removed.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) return;

  try {
    const message = await applicationService.remove(row._id);
    notify.success(message || 'Application deleted.');
    table.reload();
    refreshStatistics();
  } catch (error) {
    notify.fromError(error);
  }
}

export default {
  async mount(root) {
    renderAdminNav(root);

    $('#export-applications-btn')?.addEventListener('click', async () => {
      try {
        await applicationService.exportCSV();
        notify.success('Applications exported successfully.');
      } catch (error) {
        notify.fromError(error, 'The export could not be generated.');
      }
    });

    table = createDataTable({
      mount: $('#applications-table', root),
      searchPlaceholder: 'Search by reference, student, parent, phone or email…',
      emptyMessage: 'No applications have been submitted yet.',
      emptyIcon: 'fa-file-signature',
      filters: [
        { key: 'status', options: [{ value: 'all', label: 'All statuses' }, ...STATUSES.map((status) => ({ value: status, label: status }))] },
        {
          key: 'grade',
          options: [
            { value: 'all', label: 'All grades' },
            ...['Kindergarten KG1', 'Kindergarten KG2', 'Primary Grade 1', 'Primary Grade 2', 'Preparatory', 'Secondary'].map((grade) => ({ value: grade, label: grade })),
          ],
        },
      ],
      fetcher: (query) => applicationService.list(query),
      columns: [
        { key: 'refId', header: 'Ref ID', className: 'font-mono font-bold text-brand-blue whitespace-nowrap' },
        {
          key: 'studentName',
          header: 'Student',
          render: (row) => `
            <div class="min-w-[10rem]">
              <p class="font-bold text-slate-900">${escapeHTML(row.studentName)}</p>
              <p class="text-[11px] text-slate-500">Parent: ${escapeHTML(row.parentName)}</p>
            </div>`,
        },
        { key: 'grade', header: 'Grade', className: 'text-slate-600' },
        {
          key: 'phone',
          header: 'Contact',
          render: (row) => `
            <div class="whitespace-nowrap">
              <p class="font-mono text-slate-700">${escapeHTML(row.phone)}</p>
              <p class="text-[11px] text-slate-500 break-all">${escapeHTML(row.email)}</p>
            </div>`,
        },
        { key: 'createdAt', header: 'Submitted', className: 'text-slate-500 whitespace-nowrap', render: (row) => escapeHTML(formatDate(row.createdAt)) },
        { key: 'status', header: 'Status', render: (row) => statusBadge(row.status, STATUS_TONE[row.status]) },
        {
          key: 'actions',
          header: 'Actions',
          className: 'whitespace-nowrap',
          render: (row) => {
            const buttons = ['<button data-action="view" class="bg-blue-50 text-brand-blue px-2.5 py-1 rounded-lg hover:bg-blue-100 font-bold"><i class="fa-solid fa-eye"></i> View</button>'];
            if (can('applications.change-status')) {
              buttons.push('<button data-action="approve" class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-bold">Approve</button>');
              buttons.push('<button data-action="reject" class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 font-bold">Reject</button>');
            }
            if (can('applications.delete')) {
              buttons.push('<button data-action="delete" class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-200 font-bold"><i class="fa-solid fa-trash"></i></button>');
            }
            return `<div class="flex items-center gap-1">${buttons.join('')}</div>`;
          },
        },
      ],
      actions: {
        view: (row) => viewApplication(row),
        approve: (row) => changeStatus(row, 'Approved'),
        reject: (row) => changeStatus(row, 'Rejected'),
        delete: (row) => deleteApplication(row),
      },
    });

    await refreshStatistics();
  },

  unmount() {
    table = null;
  },
};
