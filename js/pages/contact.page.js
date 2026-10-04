import { $, withButtonLoading, formData, applyCmsText } from '../core/dom.js';
import { messageService, settingService } from '../services/index.js';
import notify from '../components/toast.js';

/**
 * Contact page.
 *
 * The form now persists to MongoDB through `POST /messages`, where the message
 * becomes visible in the Admin Panel — previously it only produced an alert().
 */

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const restore = withButtonLoading(form.querySelector('button[type="submit"]'), 'Sending…');

  try {
    const values = formData(form);
    const { message } = await messageService.submit({
      name: values.name,
      email: values.email,
      phone: values.phone,
      subject: values.subject || 'Website Contact Form',
      message: values.message,
    });
    notify.success(message, 7000);
    form.reset();
  } catch (error) {
    notify.fromError(error, 'Your message could not be sent. Please try again.');
  } finally {
    restore();
  }
}

/** Keeps the displayed contact details in sync with the CMS settings. */
async function renderContactDetails(root) {
  try {
    const { site } = await settingService.getPublic();
    if (!site) return;
    for (const element of root.querySelectorAll('[data-setting]')) {
      applyCmsText(element, site[element.dataset.setting]);
    }
  } catch {
    // The markup already carries the current details as defaults.
  }
}

export default {
  async mount(root) {
    root.querySelector('form')?.addEventListener('submit', handleSubmit);
    await renderContactDetails(root);
  },
};
