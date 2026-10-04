import { $, emptyState, skeletonCards } from '../core/dom.js';
import notify from '../components/toast.js';

/**
 * Factory for the simple "fetch a collection and render cards" pages
 * (news, events, gallery, teachers, calendar, programs).
 *
 * Each page then only has to supply its container, service, query and a card
 * renderer — the loading, empty and error states are handled once here.
 *
 * @param {object} options
 * @param {string}   options.containerId
 * @param {object}   options.service     Resource service with `.list()`.
 * @param {object}   options.query       Query passed to the service.
 * @param {Function} options.card        `(item) => string` returning card HTML.
 * @param {string}   options.emptyMessage
 * @param {string}   options.emptyIcon
 * @param {number}   options.skeletonCount
 * @param {string}   options.skeletonHeight
 * @param {Function} options.onRendered  Optional hook after a successful render.
 */
export function createListPage({
  containerId,
  service,
  query = { limit: 60 },
  card,
  emptyMessage = 'Nothing to show yet.',
  emptyIcon = 'fa-inbox',
  skeletonCount = 6,
  skeletonHeight = 'h-48',
  onRendered,
}) {
  return {
    async mount(root) {
      const container = $(`#${containerId}`, root);
      if (!container) return;

      container.innerHTML = skeletonCards(skeletonCount, skeletonHeight);

      try {
        const { items } = await service.list(query);
        container.innerHTML = items.length ? items.map(card).join('') : emptyState(emptyMessage, emptyIcon);
        if (onRendered) onRendered(container, items, root);
      } catch (error) {
        container.innerHTML = emptyState('This content could not be loaded. Please try again.', 'fa-triangle-exclamation');
        notify.fromError(error);
      }
    },
  };
}

export default createListPage;
