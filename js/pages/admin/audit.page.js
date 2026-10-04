import { $, escapeHTML, formatDateTime } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { dashboardService } from '../../services/index.js';
import renderAdminNav from './adminNav.js';

/** Audit trail — the append-only record of administrative actions. */

const ACTION_TONE = {
  create: 'emerald', update: 'blue', delete: 'rose',
  activate: 'emerald', deactivate: 'amber', 'change-role': 'purple',
  'assign-permissions': 'purple', login: 'slate', logout: 'slate', register: 'amber',
};

export default {
  async mount(root) {
    renderAdminNav(root);

    createDataTable({
      mount: $('#audit-table', root),
      searchPlaceholder: 'Filter is applied on resource and action…',
      emptyMessage: 'No administrative activity has been recorded yet.',
      emptyIcon: 'fa-clock-rotate-left',
      filters: [
        {
          key: 'resource',
          options: [
            { value: '', label: 'All resources' },
            ...['user', 'role', 'message', 'application', 'lesson', 'news', 'event', 'settings', 'auth'].map((resource) => ({
              value: resource,
              label: resource,
            })),
          ],
        },
      ],
      fetcher: (query) => dashboardService.auditLog(query),
      columns: [
        { key: 'createdAt', header: 'When', className: 'text-slate-500 whitespace-nowrap', render: (row) => escapeHTML(formatDateTime(row.createdAt)) },
        {
          key: 'actorEmail',
          header: 'Performed By',
          render: (row) => `<span class="font-semibold text-slate-800">${escapeHTML(row.actorEmail || 'system / anonymous')}</span>`,
        },
        { key: 'resource', header: 'Resource', className: 'text-slate-600' },
        { key: 'action', header: 'Action', render: (row) => statusBadge(row.action, ACTION_TONE[row.action] || 'slate') },
        {
          key: 'description',
          header: 'Details',
          render: (row) => `<span class="text-slate-600">${escapeHTML(row.description)}</span>`,
        },
      ],
    });
  },
};
