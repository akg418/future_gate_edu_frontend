import { $, escapeHTML, withButtonLoading, formData } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { authService } from '../services/index.js';
import notify from '../components/toast.js';

/** Sign-in page. Replaces the original "pick a role from a dropdown" modal. */

function showAlert(html, tone = 'error') {
  const box = $('#login-alert');
  if (!box) return;
  const tones = {
    error: 'bg-rose-50 border border-rose-200 text-rose-700',
    warning: 'bg-amber-50 border border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
  };
  box.className = `p-3 rounded-xl text-xs font-semibold ${tones[tone]}`;
  box.innerHTML = html;
  box.hidden = false;
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  $('#login-alert').hidden = true;

  const restore = withButtonLoading($('#login-submit'), 'Signing in…');
  try {
    const user = await authService.login(formData(form));
    notify.success(`Welcome back, ${user.firstName}.`);

    // Return the user to wherever a guard bounced them from.
    const redirect = sessionStorage.getItem('fg_redirect_after_login');
    sessionStorage.removeItem('fg_redirect_after_login');
    navigate(redirect || '/home');
  } catch (error) {
    // A pending or disabled account gets a specific explanation.
    if (error.code === 'ACCOUNT_PENDING') {
      showAlert(
        '<i class="fa-solid fa-clock"></i> Your account is still awaiting administrator approval. You will be able to sign in once it has been activated.',
        'warning',
      );
    } else if (error.code === 'ACCOUNT_DISABLED') {
      showAlert('<i class="fa-solid fa-ban"></i> This account has been deactivated. Please contact an administrator.', 'error');
    } else {
      showAlert(`<i class="fa-solid fa-circle-exclamation"></i> ${escapeHTML(error.message)}`, 'error');
    }
  } finally {
    restore();
  }
}

/** Show/hide toggle on password fields. */
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
    $('#login-form')?.addEventListener('submit', handleSubmit);
    wirePasswordToggles(root);
  },
};
