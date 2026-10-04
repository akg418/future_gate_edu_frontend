import { $, escapeHTML, formatDateTime } from '../../core/dom.js';
import { dashboardService, applicationService } from '../../services/index.js';
import { can } from '../../core/permissions.js';
import store from '../../core/store.js';
import notify from '../../components/toast.js';
import renderAdminNav from './adminNav.js';

/** Admin dashboard: KPI counters and the recent administrative activity feed. */

const CONTENT_LABELS = {
  lessons: { label: 'Lessons', icon: 'fa-chalkboard-user' },
  news: { label: 'News Articles', icon: 'fa-newspaper' },
  events: { label: 'Events', icon: 'fa-calendar-days' },
  gallery: { label: 'Gallery Photos', icon: 'fa-images' },
  teachers: { label: 'Teachers', icon: 'fa-user-tie' },
  media: { label: 'Media Files', icon: 'fa-folder-open' },
};

function setText(id, value) {
  const element = $(`#${id}`);
  if (element) element.textContent = value ?? '—';
}

async function loadStatistics() {
  if (!can('dashboard.stats')) return;

  try {
    const stats = await dashboardService.statistics();

    setText('stat-users', stats.users.total);
    setText('stat-users-pending', stats.users.pending);
    setText('stat-messages', stats.messages.total);
    setText('stat-messages-new', stats.messages.new);
    setText('stat-applications', stats.applications.total);
    setText('stat-applications-pending', stats.applications.pending);
    setText('stat-lessons', stats.content.lessons);

    const container = $('#content-stats');
    if (container) {
      container.innerHTML = Object.entries(stats.content)
        .map(([key, value]) => {
          const meta = CONTENT_LABELS[key] || { label: key, icon: 'fa-cube' };
          return `
            <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-white text-brand-blue flex items-center justify-center shrink-0 border border-slate-200">
                <i class="fa-solid ${escapeHTML(meta.icon)}"></i>
              </div>
              <div class="min-w-0">
                <p class="text-lg font-black text-brand-darkBlue leading-none">${escapeHTML(value)}</p>
                <p class="text-[11px] text-slate-500 truncate">${escapeHTML(meta.label)}</p>
              </div>
            </div>`;
        })
        .join('');
    }
  } catch (error) {
    notify.fromError(error, 'Dashboard statistics could not be loaded.');
  }
}

async function loadActivity() {
  const container = $('#recent-activity');
  if (!container || !can('dashboard.view')) return;

  try {
    const entries = await dashboardService.recentActivity();
    container.innerHTML = entries.length
      ? entries
          .map(
            (entry) => `
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <p class="text-slate-800 font-semibold leading-snug">${escapeHTML(entry.description)}</p>
          <p class="text-[10px] text-slate-400 mt-0.5">
            ${escapeHTML(entry.actorEmail || 'system')} &middot; ${escapeHTML(formatDateTime(entry.createdAt))}
          </p>
        </div>`,
          )
          .join('')
      : '<p class="text-xs text-slate-400 text-center py-6">No recorded activity yet.</p>';
  } catch {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Activity could not be loaded.</p>';
  }
}

export default {
  async mount(root) {
    renderAdminNav(root);

    const user = store.user;
    setText('admin-user-name', user?.fullName || '');
    setText('admin-user-role', user?.isSuperAdmin ? 'Super Admin' : user?.role?.name || 'No role');

    $('#export-applications-btn')?.addEventListener('click', async () => {
      try {
        await applicationService.exportCSV();
        notify.success('Applications exported successfully.');
      } catch (error) {
        notify.fromError(error, 'The export could not be generated.');
      }
    });

    await Promise.all([loadStatistics(), loadActivity()]);
  },
};
