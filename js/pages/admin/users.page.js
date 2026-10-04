import { $, escapeHTML, formatDate, initials } from '../../core/dom.js';
import { createDataTable, statusBadge } from '../../components/dataTable.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { userService, roleService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/**
 * User management.
 *
 * This is where the signup flow completes: a registration arrives as `pending`
 * and stays unable to log in until an administrator activates it here. Roles
 * can also be reassigned, which revokes the user's existing sessions so the new
 * permissions take effect immediately.
 */

const STATUS_TONE = { active: 'emerald', pending: 'amber', disabled: 'rose' };

let table = null;
let roles = [];

async function loadRoles() {
  try {
    const { items } = await roleService.list({ limit: 100 });
    roles = items;
  } catch {
    roles = [];
  }
}

const roleOptions = (selectedId) =>
  roles
    .map((role) => `<option value="${escapeHTML(role._id)}" ${String(role._id) === String(selectedId) ? 'selected' : ''}>${escapeHTML(role.name)}</option>`)
    .join('');

async function refreshStatistics() {
  try {
    const stats = await userService.statistics();
    $('#user-stat-total').textContent = stats.total;
    $('#user-stat-active').textContent = stats.active;
    $('#user-stat-pending').textContent = stats.pending;
    $('#user-stat-disabled').textContent = stats.disabled;
  } catch {
    // Counters are supplementary.
  }
}

async function setStatus(row, activate) {
  const verb = activate ? 'Activate' : 'Deactivate';
  const confirmed = await confirmDialog({
    title: `${verb} this account?`,
    message: activate
      ? `${row.fullName} will be able to sign in immediately.`
      : `${row.fullName} will be signed out and blocked from signing in until reactivated.`,
    confirmLabel: verb,
    variant: activate ? 'primary' : 'danger',
    icon: activate ? 'fa-circle-check' : 'fa-ban',
  });
  if (!confirmed) return;

  try {
    const { message } = activate ? await userService.activate(row._id) : await userService.deactivate(row._id);
    notify.success(message);
    table.reload();
    refreshStatistics();
  } catch (error) {
    notify.fromError(error);
  }
}

async function changeRole(row) {
  await openModal({
    title: `Change role — ${row.fullName}`,
    icon: 'fa-user-shield',
    size: 'max-w-md',
    body: `
      <form id="change-role-form" class="space-y-3">
        <p class="text-xs text-slate-500">Changing a role updates the user's permissions and signs them out of any active session.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Role</label>
          <select name="role" required class="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold">
            ${roleOptions(row.role?._id)}
          </select>
        </div>
      </form>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
      <button data-save class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">Save Role</button>`,
    onMount(overlay, close) {
      overlay.querySelector('[data-save]').addEventListener('click', async () => {
        const roleId = overlay.querySelector('[name="role"]').value;
        try {
          const { message } = await userService.changeRole(row._id, roleId);
          notify.success(message);
          close(true);
          table.reload();
        } catch (error) {
          notify.fromError(error);
        }
      });
    },
  });
}

async function openUserForm(existing = null) {
  const isEdit = Boolean(existing);

  await openModal({
    title: isEdit ? `Edit — ${existing.fullName}` : 'Add New User',
    icon: isEdit ? 'fa-user-pen' : 'fa-user-plus',
    size: 'max-w-lg',
    body: `
      <form id="user-form" class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">First Name *</label>
            <input name="firstName" required value="${escapeHTML(existing?.firstName || '')}" class="w-full p-2.5 rounded-xl border border-slate-300" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Last Name *</label>
            <input name="lastName" required value="${escapeHTML(existing?.lastName || '')}" class="w-full p-2.5 rounded-xl border border-slate-300" />
          </div>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Email *</label>
          <input name="email" type="email" required value="${escapeHTML(existing?.email || '')}" class="w-full p-2.5 rounded-xl border border-slate-300" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Phone</label>
          <input name="phone" type="tel" pattern="^(01)[0-9]{9}$" value="${escapeHTML(existing?.phone || '')}" class="w-full p-2.5 rounded-xl border border-slate-300" />
        </div>
        ${
          isEdit
            ? ''
            : `<div>
                 <label class="block font-semibold text-slate-700 mb-1">Password *</label>
                 <input name="password" type="password" required minlength="8" class="w-full p-2.5 rounded-xl border border-slate-300" />
                 <p class="text-[11px] text-slate-500 mt-1">At least 8 characters, including a letter and a number.</p>
               </div>
               <div>
                 <label class="block font-semibold text-slate-700 mb-1">Role *</label>
                 <select name="role" required class="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">${roleOptions()}</select>
               </div>
               <div>
                 <label class="block font-semibold text-slate-700 mb-1">Initial Status</label>
                 <select name="status" class="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                   <option value="active">Active — can sign in immediately</option>
                   <option value="pending" selected>Pending — requires activation</option>
                 </select>
               </div>`
        }
      </form>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
      <button data-save class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">${isEdit ? 'Save Changes' : 'Create User'}</button>`,
    onMount(overlay, close) {
      overlay.querySelector('[data-save]').addEventListener('click', async () => {
        const form = overlay.querySelector('#user-form');
        if (!form.reportValidity()) return;

        const values = Object.fromEntries(new FormData(form).entries());
        for (const key of Object.keys(values)) if (values[key] === '') delete values[key];

        try {
          const { message } = isEdit ? await userService.update(existing._id, values) : await userService.create(values);
          notify.success(message);
          close(true);
          table.reload();
          refreshStatistics();
        } catch (error) {
          notify.fromError(error);
        }
      });
    },
  });
}

async function resetPassword(row) {
  await openModal({
    title: `Reset password — ${row.fullName}`,
    icon: 'fa-key',
    size: 'max-w-md',
    body: `
      <form id="reset-form" class="space-y-3 text-xs">
        <p class="text-slate-500">The user will be signed out of all devices and must use the new password to sign in.</p>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">New Password *</label>
          <input name="newPassword" type="password" required minlength="8" class="w-full p-2.5 rounded-xl border border-slate-300" />
        </div>
      </form>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
      <button data-save class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">Reset Password</button>`,
    onMount(overlay, close) {
      overlay.querySelector('[data-save]').addEventListener('click', async () => {
        const form = overlay.querySelector('#reset-form');
        if (!form.reportValidity()) return;
        try {
          const message = await userService.resetPassword(row._id, form.newPassword.value);
          notify.success(message);
          close(true);
        } catch (error) {
          notify.fromError(error);
        }
      });
    },
  });
}

async function deleteUser(row) {
  const confirmed = await confirmDialog({
    title: 'Delete this account?',
    message: `${row.fullName} (${row.email}) will be permanently removed. This cannot be undone.`,
    confirmLabel: 'Delete Account',
  });
  if (!confirmed) return;

  try {
    const message = await userService.remove(row._id);
    notify.success(message || 'Account deleted.');
    table.reload();
    refreshStatistics();
  } catch (error) {
    notify.fromError(error);
  }
}

export default {
  async mount(root) {
    renderAdminNav(root);
    await loadRoles();

    $('#add-user-btn')?.addEventListener('click', () => openUserForm());
    $('#export-users-btn')?.addEventListener('click', async () => {
      try {
        await userService.exportCSV();
        notify.success('Users exported successfully.');
      } catch (error) {
        notify.fromError(error, 'The export could not be generated.');
      }
    });

    table = createDataTable({
      mount: $('#users-table', root),
      searchPlaceholder: 'Search by name, email or phone…',
      emptyMessage: 'No user accounts found.',
      emptyIcon: 'fa-users',
      filters: [
        {
          key: 'status',
          options: [
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Awaiting approval' },
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
          ],
        },
        {
          key: 'role',
          options: [{ value: 'all', label: 'All roles' }, ...roles.map((role) => ({ value: role._id, label: role.name }))],
        },
      ],
      fetcher: (query) => userService.list(query),
      columns: [
        {
          key: 'fullName',
          header: 'User',
          render: (row) => `
            <div class="flex items-center gap-2.5 min-w-[12rem]">
              <span class="w-8 h-8 rounded-full bg-brand-blue text-white text-[10px] font-black flex items-center justify-center shrink-0">${escapeHTML(initials(row.fullName))}</span>
              <div class="min-w-0">
                <p class="font-bold text-slate-900 truncate">${escapeHTML(row.fullName)}${row.isSuperAdmin ? ' <span class="text-brand-gold" title="Super Admin"><i class="fa-solid fa-crown text-[10px]"></i></span>' : ''}</p>
                <p class="text-[11px] text-slate-500 truncate">${escapeHTML(row.email)}</p>
              </div>
            </div>`,
        },
        { key: 'phone', header: 'Phone', className: 'font-mono text-slate-600 whitespace-nowrap', render: (row) => escapeHTML(row.phone || '—') },
        {
          key: 'role',
          header: 'Role',
          render: (row) => `<span class="px-2.5 py-1 rounded-lg bg-blue-50 text-brand-blue font-bold text-[10px]">${escapeHTML(row.isSuperAdmin ? 'Super Admin' : row.role?.name || 'No role')}</span>`,
        },
        { key: 'status', header: 'Status', render: (row) => statusBadge(row.status, STATUS_TONE[row.status]) },
        { key: 'createdAt', header: 'Registered', className: 'text-slate-500 whitespace-nowrap', render: (row) => escapeHTML(formatDate(row.createdAt)) },
        {
          key: 'actions',
          header: 'Actions',
          className: 'whitespace-nowrap',
          render: (row) => {
            // The Super Admin account is protected server-side; hide the controls too.
            if (row.isSuperAdmin) return '<span class="text-[10px] text-slate-400 italic">Protected account</span>';
            const buttons = [];
            if (can('users.activate') && row.status !== 'active') {
              buttons.push('<button data-action="activate" class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-bold" title="Activate account"><i class="fa-solid fa-check"></i> Activate</button>');
            }
            if (can('users.deactivate') && row.status === 'active') {
              buttons.push('<button data-action="deactivate" class="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 font-bold" title="Deactivate account"><i class="fa-solid fa-ban"></i> Disable</button>');
            }
            if (can('users.change-role')) {
              buttons.push('<button data-action="role" class="bg-blue-50 text-brand-blue px-2.5 py-1 rounded-lg hover:bg-blue-100 font-bold" title="Change role"><i class="fa-solid fa-user-shield"></i></button>');
            }
            if (can('users.update')) {
              buttons.push('<button data-action="edit" class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200 font-bold" title="Edit user"><i class="fa-solid fa-pen"></i></button>');
            }
            if (can('users.reset-password')) {
              buttons.push('<button data-action="password" class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200 font-bold" title="Reset password"><i class="fa-solid fa-key"></i></button>');
            }
            if (can('users.delete')) {
              buttons.push('<button data-action="delete" class="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 font-bold" title="Delete user"><i class="fa-solid fa-trash"></i></button>');
            }
            return `<div class="flex items-center gap-1">${buttons.join('') || '<span class="text-[10px] text-slate-400">—</span>'}</div>`;
          },
        },
      ],
      actions: {
        activate: (row) => setStatus(row, true),
        deactivate: (row) => setStatus(row, false),
        role: (row) => changeRole(row),
        edit: (row) => openUserForm(row),
        password: (row) => resetPassword(row),
        delete: (row) => deleteUser(row),
      },
    });

    await refreshStatistics();
  },

  unmount() {
    table = null;
    roles = [];
  },
};
