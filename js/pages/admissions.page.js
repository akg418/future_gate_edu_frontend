import { $, escapeHTML, withButtonLoading, formData } from '../core/dom.js';
import { applicationService } from '../services/index.js';
import notify from '../components/toast.js';

/**
 * Admissions page: the full application form (with document uploads) and the
 * public status tracker. Both talk to the API — nothing is kept in localStorage.
 */

const STATUS_TONE = {
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-rose-100 text-rose-800',
  'Under Review': 'bg-blue-100 text-blue-800',
  Pending: 'bg-amber-100 text-amber-800',
};

/** Submits as multipart so the three document fields upload with the form. */
async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const restore = withButtonLoading($('#adm-submit-btn'), 'Processing…');

  try {
    const values = formData(form);
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== '' && value !== undefined) body.append(key, value);
    }
    body.set('source', 'full-form');

    // File inputs keep their own names on the wire: photo / birthCertificate / nationalId.
    const photo = $('#doc-photo')?.files?.[0];
    const birth = $('#doc-birth')?.files?.[0];
    const identity = $('#doc-id')?.files?.[0];
    body.delete('photo');
    body.delete('birthCertificate');
    body.delete('nationalIdDoc');
    if (photo) body.append('photo', photo);
    if (birth) body.append('birthCertificate', birth);
    if (identity) body.append('nationalId', identity);

    const { data, message } = await applicationService.submitWithDocuments(body);
    notify.success(message, 10000);
    notify.info(`Keep your reference ID: ${data.refId}`, 14000);
    form.reset();
    resetFileLabels();
  } catch (error) {
    notify.fromError(error, 'Your application could not be submitted.');
  } finally {
    restore();
  }
}

/** Public tracker — look an application up by reference ID or phone number. */
async function handleTrack() {
  const input = $('#track-app-id');
  const box = $('#status-result-box');
  if (!input || !box) return;

  const reference = input.value.trim();
  if (!reference) {
    notify.warning('Enter your reference ID or phone number.');
    return;
  }

  box.classList.remove('hidden');
  box.innerHTML = '<p class="text-slate-500"><i class="fa-solid fa-spinner animate-spin"></i> Checking…</p>';

  try {
    const result = await applicationService.track(reference);
    box.innerHTML = `
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p class="font-bold text-slate-900">Application: ${escapeHTML(result.refId)}</p>
          <p class="text-xs text-slate-600">Student: ${escapeHTML(result.studentName)} (${escapeHTML(result.grade)})</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Submitted ${new Date(result.submittedAt).toLocaleDateString()}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold ${STATUS_TONE[result.status] || STATUS_TONE.Pending}">${escapeHTML(result.status)}</span>
      </div>`;
  } catch (error) {
    box.innerHTML = `<p class="text-rose-600 font-semibold">${escapeHTML(error.message)}</p>`;
  }
}

/** Shows the chosen filename next to each document input. */
function wireFileInputs(root) {
  const pairs = [
    ['doc-photo', 'lbl-photo'],
    ['doc-birth', 'lbl-birth'],
    ['doc-id', 'lbl-id'],
  ];
  for (const [inputId, labelId] of pairs) {
    const input = root.querySelector(`#${inputId}`);
    const label = root.querySelector(`#${labelId}`);
    if (!input || !label) continue;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      label.textContent = file.name;
      label.className = 'mt-2 inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg font-bold';
    });
  }
}

function resetFileLabels() {
  for (const id of ['lbl-photo', 'lbl-birth', 'lbl-id']) {
    const label = document.getElementById(id);
    if (!label) continue;
    label.textContent = 'No file chosen';
    label.className = 'mt-2 inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-lg font-semibold';
  }
}

export default {
  async mount(root) {
    $('#full-admission-form')?.addEventListener('submit', handleSubmit);
    $('#track-app-btn')?.addEventListener('click', handleTrack);
    $('#track-app-id')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleTrack();
      }
    });
    wireFileInputs(root);
  },
};
