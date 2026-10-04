import { $, $$, escapeHTML, debounce } from '../../core/dom.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { roleService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/**
 * Roles & Permissions.
 *
 * The Super Admin sees every permission the backend declares, grouped by area,
 * and can grant any combination of them to any role. Because the catalogue is
 * served from the backend registry, a permission added in
 * `backend/src/config/permissions.js` appears here automatically — no frontend
 * change is required.
 */

const state = {
  roles: [],
  selectedRoleId: null,
  catalogue: [],
  assigned: new Set(),
  filter: '',
};

/* ------------------------------- Role list -------------------------------- */

function renderRoleList() {
  const list = $('#roles-list');
  const count = $('#roles-count');
  if (!list) return;

  if (count) count.textContent = `${state.roles.length} role${state.roles.length === 1 ? '' : 's'}`;

  list.innerHTML = state.roles
    .map((role) => {
      const active = String(role._id) === String(state.selectedRoleId);
      return `
        <div class="rounded-2xl border ${active ? 'border-brand-blue bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'} transition">
          <button data-select-role="${escapeHTML(role._id)}" class="w-full text-left rtl:text-right p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-slate-900 text-sm truncate">
                  ${escapeHTML(role.name)}
                  ${role.isSystem ? '<span class="ml-1 text-[9px] uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">System</span>' : ''}
                </p>
                <p class="text-[11px] text-slate-500 line-clamp-2 mt-0.5">${escapeHTML(role.description || 'No description')}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 text-[10px]">
              <span class="bg-blue-100 text-brand-blue font-bold px-2 py-0.5 rounded">${role.permissions?.length ?? 0} permissions</span>
              <span class="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">${role.userCount ?? 0} users</span>
              ${role.isAssignableOnSignup ? '<span class="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Signup</span>' : ''}
            </div>
          </button>

          <div class="flex items-center gap-1 px-3 pb-3">
            ${can('roles.update') ? `<button data-edit-role="${escapeHTML(role._id)}" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-bold"><i class="fa-solid fa-pen"></i> Edit</button>` : ''}
            ${can('roles.delete') && !role.isSystem ? `<button data-delete-role="${escapeHTML(role._id)}" class="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded-lg font-bold"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
          </div>
        </div>`;
    })
    .join('');
}

/* ---------------------------- Permission matrix ---------------------------- */

function renderMatrix() {
  const container = $('#permission-matrix');
  if (!container) return;

  if (!state.selectedRoleId) {
    container.innerHTML = '<p class="text-center text-slate-400 text-xs py-16">Select a role to view its permissions.</p>';
    return;
  }

  const filter = state.filter.toLowerCase();
  const editable = can('roles.assign-permissions');

  const groups = state.catalogue
    .map((group) => ({
      group: group.group,
      permissions: group.permissions.filter(
        (permission) => !filter || permission.label.toLowerCase().includes(filter) || permission.key.toLowerCase().includes(filter),
      ),
    }))
    .filter((group) => group.permissions.length);

  if (!groups.length) {
    container.innerHTML = '<p class="text-center text-slate-400 text-xs py-16">No permissions match your filter.</p>';
    return;
  }

  container.innerHTML = groups
    .map((group) => {
      const allChecked = group.permissions.every((permission) => state.assigned.has(permission.key));
      return `
        <fieldset class="border border-slate-200 rounded-2xl p-4">
          <legend class="px-2 flex items-center gap-2">
            <span class="text-xs font-bold text-brand-darkBlue uppercase tracking-wide">${escapeHTML(group.group)}</span>
            ${
              editable
                ? `<button type="button" data-group-toggle="${escapeHTML(group.group)}" class="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-bold text-slate-600">
                     ${allChecked ? 'Clear group' : 'Select group'}
                   </button>`
                : ''
            }
          </legend>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
            ${group.permissions
              .map(
                (permission) => `
              <label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer ${editable ? '' : 'opacity-70 cursor-not-allowed'}">
                <input type="checkbox" data-permission-key="${escapeHTML(permission.key)}"
                       ${state.assigned.has(permission.key) ? 'checked' : ''} ${editable ? '' : 'disabled'}
                       class="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue shrink-0" />
                <span class="min-w-0">
                  <span class="block text-[11px] font-semibold text-slate-800 leading-tight">${escapeHTML(permission.label)}</span>
                  <span class="block text-[9px] text-slate-400 font-mono truncate">${escapeHTML(permission.key)}</span>
                </span>
              </label>`,
              )
              .join('')}
          </div>
        </fieldset>`;
    })
    .join('');

  updateMatrixHeader();
}

function updateMatrixHeader() {
  const role = state.roles.find((item) => String(item._id) === String(state.selectedRoleId));
  if (!role) return;

  $('#matrix-role-name').textContent = role.name;
  $('#matrix-role-meta').textContent = `${state.assigned.size} of ${state.catalogue.reduce((sum, group) => sum + group.permissions.length, 0)} permissions granted`;

  const editable = can('roles.assign-permissions');
  for (const id of ['matrix-save', 'matrix-select-all', 'matrix-clear-all']) {
    const element = $(`#${id}`);
    if (element) element.hidden = !editable;
  }
}

async function selectRole(roleId) {
  state.selectedRoleId = roleId;
  renderRoleList();

  const container = $('#permission-matrix');
  container.innerHTML = '<p class="text-center text-slate-400 text-xs py-16"><i class="fa-solid fa-spinner animate-spin"></i> Loading permissions…</p>';

  try {
    const data = await roleService.permissionsFor(roleId);
    state.catalogue = data.catalogue.groups;
    state.assigned = new Set(data.assigned);
    renderMatrix();
  } catch (error) {
    container.innerHTML = '<p class="text-center text-rose-500 text-xs py-16">Permissions could not be loaded.</p>';
    notify.fromError(error);
  }
}

async function savePermissions() {
  if (!state.selectedRoleId) return;
  const button = $('#matrix-save');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Saving…';

  try {
    const { message } = await roleService.setPermissions(state.selectedRoleId, [...state.assigned]);
    notify.success(message);
    await loadRoles();
    renderRoleList();
    updateMatrixHeader();
  } catch (error) {
    notify.fromError(error);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

/* ------------------------------ Role CRUD ---------------------------------- */

async function openRoleForm(existing = null) {
  const isEdit = Boolean(existing);

  await openModal({
    title: isEdit ? `Edit role — ${existing.name}` : 'Create New Role',
    icon: 'fa-user-shield',
    size: 'max-w-lg',
    body: `
      <form id="role-form" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Role Name *</label>
          <input name="name" required minlength="2" value="${escapeHTML(existing?.name || '')}"
                 ${existing?.isSystem ? 'readonly' : ''}
                 class="w-full p-2.5 rounded-xl border border-slate-300 ${existing?.isSystem ? 'bg-slate-50 text-slate-500' : ''}" />
          ${existing?.isSystem ? '<p class="text-[11px] text-slate-500 mt-1">System roles cannot be renamed.</p>' : ''}
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Description</label>
          <textarea name="description" rows="2" class="w-full p-2.5 rounded-xl border border-slate-300">${escapeHTML(existing?.description || '')}</textarea>
        </div>
        <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
          <input type="checkbox" name="isAssignableOnSignup" ${existing?.isAssignableOnSignup ? 'checked' : ''}
                 class="w-4 h-4 rounded border-slate-300 text-brand-blue" />
          <span>
            <span class="block font-semibold text-slate-800">Offer this role on the signup form</span>
            <span class="block text-[11px] text-slate-500">Visitors may select it when registering. Accounts still require activation.</span>
          </span>
        </label>
        ${
          isEdit
            ? ''
            : '<p class="text-[11px] text-slate-500">You can grant permissions to the role right after creating it.</p>'
        }
      </form>`,
    footer: `
      <button data-modal-close class="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
      <button data-save class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-darkBlue text-white">${isEdit ? 'Save Changes' : 'Create Role'}</button>`,
    onMount(overlay, close) {
      overlay.querySelector('[data-save]').addEventListener('click', async () => {
        const form = overlay.querySelector('#role-form');
        if (!form.reportValidity()) return;

        const payload = {
          name: form.name.value.trim(),
          description: form.description.value.trim(),
          isAssignableOnSignup: form.isAssignableOnSignup.checked,
        };

        try {
          const result = isEdit ? await roleService.update(existing._id, payload) : await roleService.create(payload);
          notify.success(result.message);
          close(true);
          await loadRoles();
          renderRoleList();
          if (!isEdit && result.data?._id) selectRole(result.data._id);
        } catch (error) {
          notify.fromError(error);
        }
      });
    },
  });
}

async function deleteRole(role) {
  const confirmed = await confirmDialog({
    title: `Delete role "${role.name}"?`,
    message: 'The role will be permanently removed. Roles that still have users assigned cannot be deleted.',
    confirmLabel: 'Delete Role',
  });
  if (!confirmed) return;

  try {
    const message = await roleService.remove(role._id);
    notify.success(message || 'Role deleted.');
    if (String(state.selectedRoleId) === String(role._id)) {
      state.selectedRoleId = null;
      state.assigned = new Set();
      renderMatrix();
    }
    await loadRoles();
    renderRoleList();
  } catch (error) {
    notify.fromError(error);
  }
}

async function loadRoles() {
  const { items } = await roleService.list({ limit: 100 });
  state.roles = items;
}

/* -------------------------------- Wiring ----------------------------------- */

export default {
  async mount(root) {
    renderAdminNav(root);
    Object.assign(state, { roles: [], selectedRoleId: null, catalogue: [], assigned: new Set(), filter: '' });

    $('#add-role-btn')?.addEventListener('click', () => openRoleForm());
    $('#matrix-save')?.addEventListener('click', savePermissions);

    $('#matrix-select-all')?.addEventListener('click', () => {
      for (const group of state.catalogue) for (const permission of group.permissions) state.assigned.add(permission.key);
      renderMatrix();
    });
    $('#matrix-clear-all')?.addEventListener('click', () => {
      state.assigned.clear();
      renderMatrix();
    });

    $('#matrix-search')?.addEventListener(
      'input',
      debounce((event) => {
        state.filter = event.target.value.trim();
        renderMatrix();
      }, 200),
    );

    // Checkbox and group toggles inside the matrix.
    $('#permission-matrix')?.addEventListener('change', (event) => {
      const checkbox = event.target.closest('[data-permission-key]');
      if (!checkbox) return;
      if (checkbox.checked) state.assigned.add(checkbox.dataset.permissionKey);
      else state.assigned.delete(checkbox.dataset.permissionKey);
      updateMatrixHeader();
    });

    $('#permission-matrix')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-group-toggle]');
      if (!button) return;
      const group = state.catalogue.find((item) => item.group === button.dataset.groupToggle);
      if (!group) return;
      const allChecked = group.permissions.every((permission) => state.assigned.has(permission.key));
      for (const permission of group.permissions) {
        if (allChecked) state.assigned.delete(permission.key);
        else state.assigned.add(permission.key);
      }
      renderMatrix();
    });

    // Role list actions.
    $('#roles-list')?.addEventListener('click', (event) => {
      const select = event.target.closest('[data-select-role]');
      if (select) return void selectRole(select.dataset.selectRole);

      const edit = event.target.closest('[data-edit-role]');
      if (edit) {
        const role = state.roles.find((item) => String(item._id) === edit.dataset.editRole);
        return void (role && openRoleForm(role));
      }

      const remove = event.target.closest('[data-delete-role]');
      if (remove) {
        const role = state.roles.find((item) => String(item._id) === remove.dataset.deleteRole);
        return void (role && deleteRole(role));
      }
    });

    try {
      await loadRoles();
      renderRoleList();
      if (state.roles.length) await selectRole(state.roles[0]._id);
    } catch (error) {
      notify.fromError(error, 'Roles could not be loaded.');
    }
  },

  unmount() {
    state.roles = [];
    state.catalogue = [];
    state.assigned = new Set();
  },
};
