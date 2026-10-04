import { $, escapeHTML, withButtonLoading, formData } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { authService } from '../services/index.js';
import notify from '../components/toast.js';

/**
 * Registration page.
 *
 * Two rules from the specification are visible here:
 *  - the role list is fetched from the backend, never hardcoded;
 *  - the account is created disabled, so the page ends on an "awaiting
 *    approval" message rather than signing the user in.
 */

let roles = [];

function showAlert(html, tone = 'error') {
  const box = $('#signup-alert');
  if (!box) return;
  const tones = {
    error: 'bg-rose-50 border border-rose-200 text-rose-700',
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
  };
  box.className = `p-3 rounded-xl text-xs font-semibold ${tones[tone]}`;
  box.innerHTML = html;
  box.hidden = false;
}

/** Loads the roles the backend publishes as self-assignable. */
async function loadRoles() {
  const select = $('#signup-role');
  const hint = $('#signup-role-hint');
  if (!select) return;

  try {
    roles = await authService.signupRoles();
    if (!roles.length) {
      select.innerHTML = '<option value="">No roles are currently open for registration</option>';
      select.disabled = true;
      return;
    }

    select.innerHTML =
      '<option value="">Select your role…</option>' +
      roles.map((role) => `<option value="${escapeHTML(role._id)}">${escapeHTML(role.name)}</option>`).join('');

    select.addEventListener('change', () => {
      const role = roles.find((item) => item._id === select.value);
      if (hint) hint.textContent = role?.description || '';
    });
  } catch {
    select.innerHTML = '<option value="">Roles could not be loaded</option>';
    showAlert('The list of available roles could not be loaded. Please refresh the page.', 'error');
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  $('#signup-alert').hidden = true;

  const values = formData(form);
  if (values.password !== values.confirmPassword) {
    showAlert('<i class="fa-solid fa-circle-exclamation"></i> The two passwords do not match.', 'error');
    return;
  }

  const restore = withButtonLoading($('#signup-submit'), 'Creating account…');
  try {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      role: values.role,
    };
    if (values.phone) payload.phone = values.phone;

    const result = await authService.register(payload);
    form.reset();
    $('#signup-role-hint').textContent = '';

    showAlert(
      `<i class="fa-solid fa-circle-check"></i> ${escapeHTML(result.message)}`,
      'success',
    );
    notify.success('Registration submitted successfully.', 8000);
    setTimeout(() => navigate('/login'), 4000);
  } catch (error) {
    const fields = error.fieldErrors || [];
    showAlert(
      `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHTML(error.message)}` +
        (fields.length ? `<ul class="mt-1 list-disc list-inside">${fields.map((field) => `<li>${escapeHTML(field.message)}</li>`).join('')}</ul>` : ''),
      'error',
    );
  } finally {
    restore();
  }
}

function wirePasswordToggles(root) {
  for (const button of root.querySelectorAll('[data-toggle-password]')) {
    button.addEventListener('click', () => {
      const input = root.querySelector(`#${button.dataset.togglePassword}`);
      if (!input) return;
      const revealing = input.type === 'password';
      input.type = revealing ? 'text' : 'password';
      button.innerHTML = `<i class="fa-solid ${revealing ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    });
  }
}

export default {
  async mount(root) {
    $('#signup-form')?.addEventListener('submit', handleSubmit);
    wirePasswordToggles(root);
    await loadRoles();
  },

  unmount() {
    roles = [];
  },
};
