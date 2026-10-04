import { $, escapeHTML, withButtonLoading } from '../../core/dom.js';
import { settingService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/**
 * Site settings / CMS.
 *
 * Forms are generated from the settings the backend returns, so a new setting
 * added to the seeder shows up here without a frontend change.
 */

/** Fields that deserve a textarea rather than a single-line input. */
const LONG_FIELDS = new Set(['heroDescription', 'customFaq']);

const LABELS = {
  heroTitle: 'Hero Main Title',
  heroSubtitle: 'Hero Subtitle',
  heroDescription: 'Hero Description',
  phone: 'Contact Phone',
  whatsapp: 'WhatsApp Number',
  email: 'Contact Email',
  address: 'School Address',
  facebook: 'Facebook Page',
  name: 'AI Assistant Name',
  welcomeEn: 'Welcome Message (English)',
  welcomeAr: 'Welcome Message (Arabic)',
  customFaq: 'Custom FAQ Knowledge Base (one “Q: … | A: …” per line)',
  yearsOfExcellence: 'Years Of Excellence',
  students: 'Happy Students',
  teachers: 'Expert Teachers',
  awards: 'Awards Won',
};

function fieldMarkup(key, value) {
  const label = LABELS[key] || key;
  const isNumber = typeof value === 'number';
  const arabic = key.toLowerCase().endsWith('ar');

  if (LONG_FIELDS.has(key)) {
    return `
      <div>
        <label class="block font-semibold text-slate-700 mb-1">${escapeHTML(label)}</label>
        <textarea name="${escapeHTML(key)}" rows="4"
                  class="w-full p-2.5 rounded-xl border border-slate-300 ${key === 'customFaq' ? 'font-mono text-[11px]' : ''}"
                  placeholder="${key === 'customFaq' ? 'Q: Admissions | A: Apply online or call 01206192111' : ''}">${escapeHTML(value ?? '')}</textarea>
      </div>`;
  }

  return `
    <div>
      <label class="block font-semibold text-slate-700 mb-1">${escapeHTML(label)}</label>
      <input type="${isNumber ? 'number' : 'text'}" name="${escapeHTML(key)}" value="${escapeHTML(value ?? '')}"
             class="w-full p-2.5 rounded-xl border border-slate-300 ${arabic ? 'font-arabic' : ''}" />
    </div>`;
}

/** Renders one settings group into its form and wires the save handler. */
function renderGroupForm(formId, group, values, { columns = 1 } = {}) {
  const form = $(`#${formId}`);
  if (!form) return;

  const editable = can('settings.update');

  form.innerHTML = `
    ${Object.entries(values).map(([key, value]) => fieldMarkup(key, value)).join('')}
    ${
      editable
        ? `<div class="${columns > 1 ? 'sm:col-span-2 lg:col-span-4' : ''}">
             <button type="submit" class="bg-brand-blue hover:bg-brand-darkBlue text-white px-6 py-2.5 rounded-xl font-bold transition">
               <i class="fa-solid fa-floppy-disk"></i> Save Changes
             </button>
           </div>`
        : '<p class="text-[11px] text-slate-500">You have read-only access to these settings.</p>'
    }`;

  if (!editable) {
    for (const input of form.querySelectorAll('input, textarea')) input.disabled = true;
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const restore = withButtonLoading(form.querySelector('button[type="submit"]'), 'Saving…');

    const payload = {};
    for (const [key, original] of Object.entries(values)) {
      const input = form.elements[key];
      if (!input) continue;
      payload[key] = typeof original === 'number' ? Number(input.value) : input.value;
    }

    try {
      const { message } = await settingService.updateGroup(group, payload);
      notify.success(message);
    } catch (error) {
      notify.fromError(error);
    } finally {
      restore();
    }
  });
}

export default {
  async mount(root) {
    renderAdminNav(root);

    try {
      const settings = await settingService.getAll();
      renderGroupForm('site-settings-form', 'site', settings.site || {});
      renderGroupForm('ai-settings-form', 'ai', settings.ai || {});
      renderGroupForm('stats-settings-form', 'stats', settings.stats || {}, { columns: 4 });
    } catch (error) {
      notify.fromError(error, 'Settings could not be loaded.');
    }
  },
};
