import { $, escapeHTML, initials, formData, withButtonLoading } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { authService } from '../services/index.js';
import { permissionLabel } from '../core/permissions.js';
import store from '../core/store.js';
import notify from '../components/toast.js';

/** The signed-in user's own profile, password and effective permissions. */

const STATUS_TONE = {
  active: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  disabled: 'bg-rose-100 text-rose-800',
};

function render() {
  const user = store.user;
  if (!user) return;

  $('#profile-avatar').textContent = initials(user.fullName);
  $('#profile-name').textContent = user.fullName;
  $('#profile-email').textContent = user.email;
  $('#profile-role').textContent = user.isSuperAdmin ? 'Super Admin' : user.role?.name || 'No role assigned';

  const status = $('#profile-status');
  status.textContent = user.status;
  status.className = `px-3 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_TONE[user.status] || STATUS_TONE.pending}`;

  $('#profile-first-name').value = user.firstName || '';
  $('#profile-last-name').value = user.lastName || '';
  $('#profile-phone').value = user.phone || '';

  const permissions = $('#profile-permissions');
  permissions.innerHTML = user.isSuperAdmin
    ? '<span class="px-3 py-1.5 rounded-lg bg-brand-gold/20 text-brand-darkBlue text-[11px] font-bold">Full system access (Super Admin)</span>'
    : (user.permissions || [])
        .map(
          (key) =>
            `<span class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold" title="${escapeHTML(key)}">${escapeHTML(permissionLabel(key))}</span>`,
        )
        .join('') || '<span class="text-xs text-slate-400">No permissions assigned yet.</span>';
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const restore = withButtonLoading(event.target.querySelector('button[type="submit"]'), 'Saving…');
  try {
    const { message } = await authService.updateProfile(formData(event.target));
    notify.success(message);
    render();
  } catch (error) {
    notify.fromError(error);
  } finally {
    restore();
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  const restore = withButtonLoading(event.target.querySelector('button[type="submit"]'), 'Updating…');
  try {
    const message = await authService.changePassword(formData(event.target));
    notify.success(message, 7000);
    navigate('/login');
  } catch (error) {
    notify.fromError(error);
  } finally {
    restore();
  }
}

export default {
  async mount() {
    // Re-read the identity so a role or permission change shows immediately.
    try {
      await authService.me();
    } catch {
      // The cached user is good enough to render the page.
    }
    render();
    $('#profile-form')?.addEventListener('submit', handleProfileSubmit);
    $('#password-form')?.addEventListener('submit', handlePasswordSubmit);
  },
};
