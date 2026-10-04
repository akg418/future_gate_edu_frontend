import { $, escapeHTML, formatDateTime } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { messageService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/**
 * Contact messages management.
 *
 * Messages submitted from the public website are stored in MongoDB and listed
 * here in a table the admin can search, filter, read, reply to, re-status and
 * delete — each action gated by its own permission on both sides.
 */

const STATUS_TONE = { new: 'rose', read: 'blue', replied: 'emerald', archived: 'slate' };

let table = null;

async function refreshStatistics() {
  try {
    const stats = await messageService.statistics();
    $('#msg-stat-total').textContent = stats.total;
    $('#msg-stat-new').textContent = stats.new;
    $('#msg-stat-replied').textContent = stats.replied;
    $('#msg-stat-archived').textContent = stats.archived;
  } catch {
    // The counters are supplementary; the table is the source of truth.
  }
}

/** Opens the full message, with reply and status controls when permitted. */
async function openMessage(row) {
  let message = row;
  try {
    // Fetching marks the message read and returns the full record.
    message = await messageService.get(row._id);
  } catch (error) {
    notify.fromError(error);
    return;
  }

  const canReply = can('messages.reply');
  const canStatus = can('messages.change-status');

  await openModal({
    title: message.subject || 'Contact Message',
    icon: 'fa-envelope-open-text',
    size: 'max-w-2xl',
    body: `
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p class="text-[10px] uppercase font-bold text-slate-400">From</p>
            <p class="font-bold text-slate-900">${escapeHTML(message.name)}</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p class="text-[10px] uppercase font-bold text-slate-400">Received</p>
            <p class="font-semibold text-slate-700">${escapeHTML(formatDateTime(message.createdAt))}</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p class="text-[10px] uppercase font-bold text-slate-400">Email</p>
            <a href="mailto:${escapeHTML(message.email)}" class="font-semibold text-brand-blue break-all">${escapeHTML(message.email)}</a>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p class="text-[10px] uppercase font-bold text-slate-400">Phone</p>
            <a href="tel:${escapeHTML(message.phone)}" class="font-semibold text-brand-blue font-mono">${escapeHTML(message.phone)}</a>
          </div>
        </div>

        <div>
          <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Message</p>
          <p class="p-4 rounded-xl bg-white border border-slate-200 leading-relaxed whitespace-pre-line">${escapeHTML(message.message)}</p>
        </div>

        ${
          message.reply
            ? `<div>
                 <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Previous Reply</p>
                 <p class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 leading-relaxed whitespace-pre-line">${escapeHTML(message.reply)}</p>
                 <p class="text-[10px] text-slate-400 mt-1">Replied ${escapeHTML(formatDateTime(message.repliedAt))}</p>
               </div>`
            : ''
        }

        ${
          canReply
            ? `<form id="reply-form">
                 <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Write a Reply</label>
                 <textarea name="reply" rows="4" required minlength="2"
                           class="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-brand-blue"
                           placeholder="Type your response…">${escapeHTML(message.reply || '')}</textarea>
               </form>`
            : ''
        }
      </div>`,
    footer: `
      ${
        canStatus
          ? `<select data-status-select class="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold mr-auto rtl:mr-0 rtl:ml-auto">
               ${['new', 'read', 'replied', 'archived']
                 .map((value) => `<option value="${value}" ${value === message.status ? 'selected' : ''}>Mark as ${value}</option>`)
                 .join('')}
             </select>`
          : ''
      }
      <a href="mailto:${escapeHTML(message.email)}" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">
        <i class="fa-solid fa-envelope"></i> Email
      </a>
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
      ${canReply ? '<button data-send-reply class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">Save Reply</button>' : ''}`,

    onMount(overlay, close) {
      overlay.querySelector('[data-status-select]')?.addEventListener('change', async (event) => {
        try {
          await messageService.changeStatus(message._id, event.target.value);
          notify.success(`Message marked as "${event.target.value}".`);
          table?.reload();
          refreshStatistics();
        } catch (error) {
          notify.fromError(error);
        }
      });

      overlay.querySelector('[data-send-reply]')?.addEventListener('click', async () => {
        const text = overlay.querySelector('[name="reply"]')?.value.trim();
        if (!text || text.length < 2) {
          notify.warning('Please write a reply before saving.');
          return;
        }
        try {
          await messageService.reply(message._id, text);
          notify.success('Reply saved and the message marked as replied.');
          close(true);
          table?.reload();
          refreshStatistics();
        } catch (error) {
          notify.fromError(error);
        }
      });
    },
  });

  // Reading may have changed the status from new to read.
  table?.reload();
  refreshStatistics();
}

async function deleteMessage(row) {
  const confirmed = await confirmDialog({
    title: 'Delete this message?',
    message: `The message from ${row.name} will be permanently removed. This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!confirmed) return;

  try {
    const message = await messageService.remove(row._id);
    notify.success(message || 'Message deleted.');
    table.reload();
    refreshStatistics();
  } catch (error) {
    notify.fromError(error);
  }
}

export default {
  async mount(root) {
    renderAdminNav(root);

    $('#export-messages-btn')?.addEventListener('click', async () => {
      try {
        await messageService.exportCSV();
        notify.success('Messages exported successfully.');
      } catch (error) {
        notify.fromError(error, 'The export could not be generated.');
      }
    });

    table = createDataTable({
      mount: $('#messages-table', root),
      searchPlaceholder: 'Search by name, email, phone or subject…',
      emptyMessage: 'No messages have been received yet.',
      emptyIcon: 'fa-envelope-open',
      filters: [
        {
          key: 'status',
          options: [
            { value: 'all', label: 'All statuses' },
            { value: 'new', label: 'Unread' },
            { value: 'read', label: 'Read' },
            { value: 'replied', label: 'Replied' },
            { value: 'archived', label: 'Archived' },
          ],
        },
      ],
      fetcher: (query) => messageService.list(query),
      columns: [
        {
          key: 'name',
          header: 'From',
          render: (row) => `
            <div class="min-w-[10rem]">
              <p class="font-bold text-slate-900 ${row.status === 'new' ? 'flex items-center gap-1.5' : ''}">
                ${row.status === 'new' ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>' : ''}${escapeHTML(row.name)}
              </p>
              <p class="text-[11px] text-slate-500 break-all">${escapeHTML(row.email)}</p>
            </div>`,
        },
        { key: 'phone', header: 'Phone', className: 'font-mono text-slate-600 whitespace-nowrap' },
        {
          key: 'subject',
          header: 'Subject',
          render: (row) => `
            <div class="max-w-xs">
              <p class="font-semibold text-slate-800 truncate">${escapeHTML(row.subject)}</p>
              <p class="text-[11px] text-slate-500 truncate">${escapeHTML(row.message)}</p>
            </div>`,
        },
        { key: 'createdAt', header: 'Received', className: 'text-slate-500 whitespace-nowrap', render: (row) => escapeHTML(formatDateTime(row.createdAt)) },
        { key: 'status', header: 'Status', render: (row) => statusBadge(row.status, STATUS_TONE[row.status]) },
        {
          key: 'actions',
          header: 'Actions',
          className: 'whitespace-nowrap',
          render: (row) => `
            <div class="flex items-center gap-1">
              <button data-action="view" class="bg-blue-50 text-brand-blue px-2.5 py-1 rounded-lg hover:bg-blue-100 font-bold" title="View message">
                <i class="fa-solid fa-eye"></i> View
              </button>
              ${
                can('messages.delete')
                  ? `<button data-action="delete" class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 font-bold" title="Delete message">
                       <i class="fa-solid fa-trash"></i>
                     </button>`
                  : ''
              }
            </div>`,
        },
      ],
      actions: {
        view: (row) => openMessage(row),
        delete: (row) => deleteMessage(row),
      },
    });

    await refreshStatistics();
  },

  unmount() {
    table = null;
  },
};
